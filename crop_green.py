from PIL import Image

def crop_green():
    import glob
    import os
    
    # Find the latest green screen icon
    files = glob.glob("/Users/sakanet/.gemini/antigravity/brain/d54b4b6b-bbc0-4bbf-852c-3cb102bf611f/icon_green_screen_large_*.png")
    if not files:
        print("No green screen icon found")
        return
        
    latest_file = max(files, key=os.path.getctime)
    print(f"Processing {latest_file}")
    
    img = Image.open(latest_file)
    width, height = img.size
    print(f"Original size: {width}x{height}")
    
    # Green color to detect
    # #00FF00 is (0, 255, 0)
    # But screenshot might have compression artifacts or rendering slight shifts.
    # We look for "Very Green" pixels.
    # Debug: Print first row colors
    first_row = [img.getpixel((x, 0)) for x in range(width)]
    unique_colors = set(first_row)
    print(f"Unique colors in first row: {list(unique_colors)[:5]}...")
    
    # Target Green Color specifically
    # The background we want to remove is the Green Screen.
    # Anything else (Icon) is content.
    # Window frame (Blue) is also "background" in a sense, but we want to stop at the Green edge.
    # Wait, if we scan from center (Icon), we will hit Green.
    # So the bounds will be the inner edge of the Green.
    # This effectively crops out the Green AND the Blue frame outside it.
    
    # Debug: Sample pixels
    cx, cy = width // 2, height // 2
    print(f"Center pixel: {img.getpixel((cx, cy))}")
    print(f"Left-Mid pixel (100, {cy}): {img.getpixel((100, cy))}")
    print(f"Right-Mid pixel ({width-100}, {cy}): {img.getpixel((width-100, cy))}")
    print(f"Top-Mid pixel ({cx}, 100): {img.getpixel((cx, 100))}")
    print(f"Bottom-Mid pixel ({cx}, {height-100}): {img.getpixel((cx, height-100))}")
    
    def is_green_bg(p):
        # Green: (0, 255, 0)
        # Observed: (110, 235, 76)
        # Relaxed threshold
        return p[1] > 200 and p[0] < 150 and p[2] < 150
        
    # Use this as the background check
    def is_background(p):
        return is_green_bg(p)
        
    # Center-Out Scanning
    # We assume the icon is in the center of the green field.
    # The browser chrome is at the edges (if any).
    # So we want to find the bounds of the "Content" (Icon) starting from the center.
    
    cx, cy = width // 2, height // 2
    center_pixel = img.getpixel((cx, cy))
    print(f"Center pixel: {center_pixel}")
    
    # Check if center is "Green" (Background)
    # If center is background, then something is wrong (icon not centered or small).
    if is_background(center_pixel):
        print("Center pixel is background! Icon not found at center.")
        # Fallback?
        return

    # Scan Left
    left = 0
    for x in range(cx, -1, -1):
        if is_background(img.getpixel((x, cy))):
            left = x + 1
            break
            
    # Scan Right
    right = width
    for x in range(cx, width):
        if is_background(img.getpixel((x, cy))):
            right = x
            break
            
    # Scan Up
    top = 0
    for y in range(cy, -1, -1):
        if is_background(img.getpixel((cx, y))):
            top = y + 1
            break
            
    # Scan Down
    bottom = height
    for y in range(cy, height):
        if is_background(img.getpixel((cx, y))):
            bottom = y
            break
            
    print(f"Detected center content box: {left}, {top}, {right}, {bottom}")
    
    # Now we have the "Cross" bounds. 
    # But the icon might be wider/taller at other y/x.
    # The icon is a square (with rounded corners).
    # So the cross bounds should give us the max width/height if we hit the edges.
    # But if it's a circle or rounded rect, scanning from center might miss corners?
    # Actually, for a rounded rect, center scan hits the flat sides, which is the max width/height.
    # So this should be accurate for the bounding box.
    
    # Crop
    cropped = img.crop((left, top, right, bottom))
    
    # Resize to 512x512
    final = cropped.resize((512, 512), Image.Resampling.LANCZOS)
    
    final.save("public/icon.png", "PNG")
    print("Saved center-cropped icon to public/icon.png")
            
    print(f"Detected content box: {left}, {top}, {right}, {bottom}")
    
    # Crop
    cropped = img.crop((left, top, right, bottom))
    
    # Resize to 512x512 (just in case of slight off-by-one or scaling)
    final = cropped.resize((512, 512), Image.Resampling.LANCZOS)
    
    final.save("public/icon.png", "PNG")
    print("Saved green-cropped icon to public/icon.png")

if __name__ == "__main__":
    crop_green()
