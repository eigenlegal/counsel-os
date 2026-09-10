// Build-time vector rendering of Counsel's existing two-page book mark.
// This program is not included in the application or invoked at runtime.
import AppKit
@main struct BuildIcon {
    static func main() throws {
        guard CommandLine.arguments.count == 2 else { throw CocoaError(.fileWriteInvalidFileName) }
        let directory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false)
        for (name, size) in [("icon_16x16",16),("icon_16x16@2x",32),("icon_32x32",32),("icon_32x32@2x",64),("icon_128x128",128),("icon_128x128@2x",256),("icon_256x256",256),("icon_256x256@2x",512),("icon_512x512",512),("icon_512x512@2x",1024)] {
            let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
            NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
            let transform = NSAffineTransform(); transform.scale(by: CGFloat(size) / 1024); transform.concat()
            NSColor(srgbRed: 23/255, green: 46/255, blue: 73/255, alpha: 1).setFill()
            NSBezierPath(roundedRect: NSRect(x:64,y:64,width:896,height:896), xRadius:200,yRadius:200).fill()
            let blue = NSColor(srgbRed:153/255,green:180/255,blue:240/255,alpha:1); blue.setStroke(); blue.setFill()
            let left = NSBezierPath(); left.move(to:NSPoint(x:330,y:302)); left.line(to:NSPoint(x:487,y:350)); left.line(to:NSPoint(x:487,y:748)); left.line(to:NSPoint(x:330,y:700)); left.close()
            left.lineWidth=22; left.lineJoinStyle = .round; left.stroke()
            let right = NSBezierPath(); right.move(to:NSPoint(x:540,y:365)); right.line(to:NSPoint(x:694,y:320)); right.line(to:NSPoint(x:694,y:650)); right.line(to:NSPoint(x:540,y:695)); right.close(); right.fill()
            NSGraphicsContext.restoreGraphicsState()
            try bitmap.representation(using:.png,properties:[:])!.write(to:directory.appendingPathComponent(name + ".png"),options:.withoutOverwriting)
        }
    }
}
