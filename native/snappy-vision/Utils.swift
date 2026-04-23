import Foundation

enum Utils {
  static func invert<K: Hashable, V: Hashable>(_ dict: [K: V]) -> [V: K] {
    var result: [V: K] = [:]
    result.reserveCapacity(dict.count)
    for (k, v) in dict {
      result[v] = k
    }
    return result
  }
}
