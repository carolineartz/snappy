// snappy-ocr: extract text from an image using the macOS Vision framework.
// Usage: snappy-ocr <image-path>
// On success, prints recognized text lines to stdout and exits 0.
// On failure, writes an error message to stderr and exits non-zero.

import AppKit
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count == 2 else {
  FileHandle.standardError.write(
    Data("usage: snappy-ocr <image-path>\n".utf8))
  exit(64)
}

let imagePath = args[1]

guard let image = NSImage(contentsOfFile: imagePath),
  let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
  FileHandle.standardError.write(
    Data("failed to load image: \(imagePath)\n".utf8))
  exit(1)
}

var recognizedText = ""

let request = VNRecognizeTextRequest { request, error in
  if let error = error {
    FileHandle.standardError.write(
      Data("vision error: \(error.localizedDescription)\n".utf8))
    return
  }
  guard let observations = request.results as? [VNRecognizedTextObservation] else {
    return
  }
  let lines = observations.compactMap {
    $0.topCandidates(1).first?.string
  }
  recognizedText = lines.joined(separator: "\n")
}

request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
do {
  try handler.perform([request])
} catch {
  FileHandle.standardError.write(
    Data("ocr failed: \(error.localizedDescription)\n".utf8))
  exit(1)
}

FileHandle.standardOutput.write(Data(recognizedText.utf8))
