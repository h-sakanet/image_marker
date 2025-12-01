from PIL import Image

def crop_border():
    # Load the raw screenshot
    # Note: The filename has a timestamp, so we need to find it or use the one we just saved.
    # Since I don't know the exact timestamp, I'll rely on the user/agent to pass the path or rename it.
    # Actually, I can search for it.
    
    import glob
    import os
    
    # Find the latest raw icon
    files = glob.glob("/Users/sakanet/.gemini/antigravity/brain/d54b4b6b-bbc0-4bbf-852c-3cb102bf611f/icon_final_v4_raw_*.png")
    if not files:
        print("No raw icon found")
        return
        
    latest_file = max(files, key=os.path.getctime)
    print(f"Processing {latest_file}")
    
    img = Image.open(latest_file)
    
    # Check dimensions
    width, height = img.size
    print(f"Original size: {width}x{height}")
    
    # If the screenshot is larger than 512x512 (e.g. retina 2x), we need to handle that.
    # But usually browser tool returns logical pixels or scaled.
    # If it's 512x512, we might just need to crop 1px from edges if there's a border.
    
    # Let's inspect the corners.
    # Top-left (0,0)
    tl = img.getpixel((0, 0))
    print(f"Top-Left pixel: {tl}")
    
    # If it's blue-ish (not the gray gradient), it's a border.
    # Gray gradient starts around #FDFBFB (253, 251, 251)
    
    # Simple heuristic: Crop 2 pixels from all sides to be safe?
    # Or just resize to 512x512 after cropping?
    
    # Intelligent Cropping
    # The border is likely the blue color (80, 123, 234) or similar.
    # We want to find the bounding box of the content (which is the gray gradient).
    
    # Convert to numpy for speed if available, but PIL is fine for this size.
    bg_color = (80, 123, 234) # Approximate blue border
    
    # Scan for bounding box
    left, top, right, bottom = 0, 0, width, height
    
    # Debug: Print first row colors
    first_row = [img.getpixel((x, 0)) for x in range(width)]
    unique_colors = set(first_row)
    print(f"Unique colors in first row: {list(unique_colors)[:5]}...")

    # Refined Logic: Detect Content by Brightness
    # The content is light gray/white. The border is blue (darker).
    # We define "Content Pixel" as one where R, G, B are all > 200.
    # If a row/col contains NO content pixels, it is considered border.
    
    threshold = 200
    
    # Find Top
    for y in range(height):
        row = [img.getpixel((x, y)) for x in range(width)]
        has_content = any(p[0] > threshold and p[1] > threshold and p[2] > threshold for p in row)
        if has_content:
            top = y
            break
            
    # Find Bottom
    for y in range(height-1, -1, -1):
        row = [img.getpixel((x, y)) for x in range(width)]
        has_content = any(p[0] > threshold and p[1] > threshold and p[2] > threshold for p in row)
        if has_content:
            bottom = y + 1
            break
            
    # Find Left
    for x in range(width):
        col = [img.getpixel((x, y)) for y in range(top, bottom)]
        has_content = any(p[0] > threshold and p[1] > threshold and p[2] > threshold for p in col)
        if has_content:
            left = x
            break
            
    # Find Right
    for x in range(width-1, -1, -1):
        col = [img.getpixel((x, y)) for y in range(top, bottom)]
        has_content = any(p[0] > threshold and p[1] > threshold and p[2] > threshold for p in col)
        if has_content:
            right = x + 1
            break
            
    print(f"Detected content box: {left}, {top}, {right}, {bottom}")
    
    # Crop
    cropped = img.crop((left, top, right, bottom))
    
    # Resize to 512x512
    final = cropped.resize((512, 512), Image.Resampling.LANCZOS)
    
    final.save("public/icon.png", "PNG")
    print("Saved auto-cropped icon to public/icon.png")

if __name__ == "__main__":
    crop_border()
