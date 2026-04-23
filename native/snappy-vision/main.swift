// snappy-vision: multimodal on-device vision helper for Snappy.
//
// Usage:
//   snappy-vision image <image-path> <models-dir> <resources-dir>
//   snappy-vision text  <query>      <models-dir> <resources-dir>
//
// `image` mode runs OCR + VNClassifyImageRequest + MobileCLIP image encoder
// on the image and emits a JSON document on stdout:
//   { "ocrText": "...", "labels": [{"label": "...", "confidence": 0.x}, ...],
//     "embedding": [f, f, ...] }
//
// `text` mode tokenizes the query with CLIPTokenizer and runs the MobileCLIP
// text encoder, emitting just:
//   { "embedding": [f, f, ...] }
//
// <models-dir> must contain mobileclip_s1_image.mlpackage and
// mobileclip_s1_text.mlpackage. <resources-dir> must contain clip-merges.txt
// and clip-vocab.json.

import AppKit
import CoreML
import Foundation
import Vision

// MARK: - Helpers

let stderr = FileHandle.standardError
let stdout = FileHandle.standardOutput

func die(_ message: String, code: Int32 = 1) -> Never {
  stderr.write(Data("snappy-vision: \(message)\n".utf8))
  exit(code)
}

func usage() -> Never {
  die(
    """
    usage: snappy-vision image <image-path> <models-dir> <resources-dir>
           snappy-vision text  <query>      <models-dir> <resources-dir>
    """,
    code: 64)
}

func writeJSON(_ object: Any) {
  let data = try! JSONSerialization.data(withJSONObject: object, options: [])
  stdout.write(data)
}

// MARK: - Image preprocessing

/// Center-crop to square, resize to `side` px, render as 32ARGB CVPixelBuffer.
/// MobileCLIP S1 expects 256x256; normalization is baked into the model.
func pixelBuffer(from cgImage: CGImage, side: Int = 256) -> CVPixelBuffer? {
  let ci = CIImage(cgImage: cgImage)
  let extent = ci.extent
  let minSide = min(extent.width, extent.height)
  let cropped = ci.cropped(
    to: CGRect(
      x: extent.origin.x + (extent.width - minSide) / 2,
      y: extent.origin.y + (extent.height - minSide) / 2,
      width: minSide,
      height: minSide))

  let scale = CGFloat(side) / minSide
  let resized = cropped.transformed(
    by: CGAffineTransform(scaleX: scale, y: scale)
  ).transformed(by: CGAffineTransform(translationX: -cropped.extent.minX * scale, y: -cropped.extent.minY * scale))

  let attrs: [CFString: Any] = [
    kCVPixelBufferCGImageCompatibilityKey: true,
    kCVPixelBufferCGBitmapContextCompatibilityKey: true,
  ]
  var buffer: CVPixelBuffer?
  let status = CVPixelBufferCreate(
    kCFAllocatorDefault, side, side, kCVPixelFormatType_32ARGB,
    attrs as CFDictionary, &buffer)
  guard status == kCVReturnSuccess, let buf = buffer else { return nil }

  let ctx = CIContext(options: nil)
  ctx.render(resized, to: buf)
  return buf
}

// MARK: - Model loading (lazy compile + cache)

/// Compiles a .mlpackage on first use and loads the resulting .mlmodelc.
/// Subsequent calls with the same package URL reuse the compiled cache.
func loadModel(at packageURL: URL) throws -> MLModel {
  let compiledURL = try MLModel.compileModel(at: packageURL)
  let config = MLModelConfiguration()
  config.computeUnits = .all
  return try MLModel(contentsOf: compiledURL, configuration: config)
}

func extractEmbedding(_ features: MLFeatureProvider) -> [Float]? {
  // MobileCLIP outputs a feature named `final_emb_1`.
  guard let value = features.featureValue(for: "final_emb_1")?.multiArrayValue else {
    return nil
  }
  let count = value.count
  var result = [Float](repeating: 0, count: count)
  let pointer = value.dataPointer.bindMemory(to: Float32.self, capacity: count)
  for i in 0..<count { result[i] = pointer[i] }
  return normalizeL2(result)
}

func normalizeL2(_ v: [Float]) -> [Float] {
  let norm = sqrtf(v.reduce(0) { $0 + $1 * $1 })
  guard norm > 0 else { return v }
  return v.map { $0 / norm }
}

// MARK: - Modes

func runImageMode(imagePath: String, modelsDir: String, resourcesDir: String) {
  _ = resourcesDir  // unused in image mode; reserved for symmetry
  guard let nsImage = NSImage(contentsOfFile: imagePath),
    let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil)
  else {
    die("failed to load image: \(imagePath)")
  }

  // 1. OCR
  var ocrText = ""
  let ocr = VNRecognizeTextRequest { req, _ in
    if let obs = req.results as? [VNRecognizedTextObservation] {
      ocrText = obs.compactMap { $0.topCandidates(1).first?.string }
        .joined(separator: "\n")
    }
  }
  ocr.recognitionLevel = .accurate
  ocr.usesLanguageCorrection = true

  // 2. Classification
  var labels: [[String: Any]] = []
  let classify = VNClassifyImageRequest { req, _ in
    if let obs = req.results as? [VNClassificationObservation] {
      labels =
        obs
        .prefix(20)
        .filter { $0.confidence > 0.1 }
        .map { ["label": $0.identifier, "confidence": Double($0.confidence)] }
    }
  }

  let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
  do {
    try handler.perform([ocr, classify])
  } catch {
    die("Vision failed: \(error.localizedDescription)")
  }

  // 3. CLIP image embedding
  var embedding: [Float] = []
  let imagePackage = URL(fileURLWithPath: modelsDir).appendingPathComponent(
    "mobileclip_s1_image.mlpackage")
  do {
    let model = try loadModel(at: imagePackage)
    guard let buf = pixelBuffer(from: cgImage, side: 256) else {
      die("pixel buffer allocation failed")
    }
    let inputName = model.modelDescription.inputDescriptionsByName.keys.first ?? "image"
    let input = try MLDictionaryFeatureProvider(dictionary: [
      inputName: MLFeatureValue(pixelBuffer: buf)
    ])
    let out = try model.prediction(from: input)
    embedding = extractEmbedding(out) ?? []
  } catch {
    die("CLIP image encode failed: \(error.localizedDescription)")
  }

  writeJSON([
    "ocrText": ocrText,
    "labels": labels,
    "embedding": embedding,
  ])
}

func runTextMode(query: String, modelsDir: String, resourcesDir: String) {
  let tokenizer = CLIPTokenizer(resourcesPath: resourcesDir)
  let tokens = tokenizer.encode_full(text: query)

  guard let tokenArray = try? MLMultiArray(shape: [1, 77], dataType: .int32) else {
    die("could not allocate token MLMultiArray")
  }
  let ptr = tokenArray.dataPointer.bindMemory(to: Int32.self, capacity: 77)
  for i in 0..<77 { ptr[i] = Int32(tokens[i]) }

  let textPackage = URL(fileURLWithPath: modelsDir).appendingPathComponent(
    "mobileclip_s1_text.mlpackage")

  do {
    let model = try loadModel(at: textPackage)
    let inputName = model.modelDescription.inputDescriptionsByName.keys.first ?? "text"
    let input = try MLDictionaryFeatureProvider(dictionary: [
      inputName: MLFeatureValue(multiArray: tokenArray)
    ])
    let out = try model.prediction(from: input)
    let embedding = extractEmbedding(out) ?? []
    writeJSON(["embedding": embedding])
  } catch {
    die("CLIP text encode failed: \(error.localizedDescription)")
  }
}

// MARK: - Entry

let args = CommandLine.arguments
guard args.count >= 5 else { usage() }
let mode = args[1]

switch mode {
case "image":
  runImageMode(imagePath: args[2], modelsDir: args[3], resourcesDir: args[4])
case "text":
  runTextMode(query: args[2], modelsDir: args[3], resourcesDir: args[4])
default:
  usage()
}
