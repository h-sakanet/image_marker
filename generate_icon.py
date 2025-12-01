from PIL import Image, ImageDraw

def draw_round_line(draw, xy, fill, width):
    x1, y1, x2, y2 = xy
    draw.line(xy, fill=fill, width=width)
    r = width / 2
    draw.ellipse((x1-r, y1-r, x1+r, y1+r), fill=fill)
    draw.ellipse((x2-r, y2-r, x2+r, y2+r), fill=fill)

def generate_icon():
    size = 512
    scale = size / 100.0
    
    # Create white background
    base = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    
    # Layer 1: Pink Line
    # Path: M50 10 L15 80
    layer1 = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw1 = ImageDraw.Draw(layer1)
    pink_color = (255, 105, 180, int(255 * 0.9)) # #FF69B4, 0.9 opacity
    width = int(14 * scale)
    draw_round_line(draw1, (50*scale, 10*scale, 15*scale, 80*scale), pink_color, width)
    
    # Layer 2: Green Line
    # Path: M50 10 L85 80
    layer2 = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw2 = ImageDraw.Draw(layer2)
    green_color = (0, 255, 0, int(255 * 0.9)) # #00FF00, 0.9 opacity
    draw_round_line(draw2, (50*scale, 10*scale, 85*scale, 80*scale), green_color, width)
    
    # Layer 3: Crossbar
    # Path: M32 57 L68 57
    layer3 = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw3 = ImageDraw.Draw(layer3)
    gray_color = (51, 51, 51, int(255 * 0.2)) # #333333, 0.2 opacity
    bar_width = int(5 * scale)
    draw_round_line(draw3, (32*scale, 57*scale, 68*scale, 57*scale), gray_color, bar_width)
    
    # Composite
    out = Image.alpha_composite(base, layer1)
    out = Image.alpha_composite(out, layer2)
    out = Image.alpha_composite(out, layer3)
    
    # Save
    out.save("public/icon.png", "PNG")
    print("Icon generated successfully: public/icon.png")

if __name__ == "__main__":
    generate_icon()
