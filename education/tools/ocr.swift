// Reads the text of one picture with the text recogniser of macOS (Vision).
// Run by ocr.ts:
//
//   swift ocr.swift <picture> <language>...
//
// Prints `size`, the picture's width and its height in pixels, then one line
// per recognised line: its left, top, right and bottom as shares of the
// picture measured from the top left corner, the recogniser's confidence, and
// the text, all separated by tabs. Nothing is sent anywhere.

import Foundation
import ImageIO
import Vision

func fail(_ message: String) -> Never {
  FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
  exit(1)
}

let arguments = CommandLine.arguments
if arguments.count < 3 { fail("usage: swift ocr.swift <picture> <language>...") }

let url = URL(fileURLWithPath: arguments[1]) as CFURL
guard let source = CGImageSourceCreateWithURL(url, nil), let picture = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
  fail("cannot read the picture at \(arguments[1])")
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = Array(arguments.dropFirst(2))
request.usesLanguageCorrection = true

do {
  try VNImageRequestHandler(cgImage: picture, options: [:]).perform([request])
} catch {
  fail("text recognition failed: \(error)")
}

print("size\t\(picture.width)\t\(picture.height)")
for observation in request.results ?? [] {
  guard let candidate = observation.topCandidates(1).first else { continue }
  let box = observation.boundingBox
  let text = candidate.string.replacingOccurrences(of: "\t", with: " ").replacingOccurrences(of: "\n", with: " ")
  print(String(format: "%.5f\t%.5f\t%.5f\t%.5f\t%.2f\t%@", box.minX, 1 - box.maxY, box.maxX, 1 - box.minY, candidate.confidence, text))
}
