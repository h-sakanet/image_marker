from PIL import Image, ImageDraw, ImagePath

def draw_rounded_rect(draw, xy, fill, radius):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill)

def draw_round_line(draw, xy, fill, width):
    x1, y1, x2, y2 = xy
    draw.line(xy, fill=fill, width=int(width))
    r = width / 2
    draw.ellipse((x1-r, y1-r, x1+r, y1+r), fill=fill)
    draw.ellipse((x2-r, y2-r, x2+r, y2+r), fill=fill)

def create_gradient(width, height, start_color, end_color):
    base = Image.new('RGBA', (width, height), start_color)
    top = Image.new('RGBA', (width, height), end_color)
    mask = Image.new('L', (width, height))
    mask_data = []
    for y in range(height):
        for x in range(width):
            # Linear gradient from top-left to bottom-right
            p = (x + y) / (width + height)
            mask_data.append(int(255 * p))
    mask.putdata(mask_data)
    base.paste(top, (0, 0), mask)
    return base

def generate_icon():
    size = 512
    scale = size / 100.0
    
    # 1. Background: Pale Gray Gradient
    # From #F8F9FA (very light gray) to #E0E5EC (light blue-gray)
    bg = create_gradient(size, size, (248, 249, 250), (224, 229, 236))
    
    # Draw logic wrapper
    draw = ImageDraw.Draw(bg)
    
    # 2. Paper Shape
    # Centered, slightly smaller than icon
    # Rect: 20, 15 to 80, 85 (in 100x100 coords)
    paper_x1, paper_y1 = 20 * scale, 15 * scale
    paper_x2, paper_y2 = 80 * scale, 85 * scale
    
    # Draw shadow first
    shadow_offset = 4 * scale
    draw.rounded_rectangle(
        (paper_x1, paper_y1 + shadow_offset, paper_x2, paper_y2 + shadow_offset),
        radius=8*scale,
        fill=(0, 0, 0, 30)
    )
    
    # Draw main paper
    # We need a custom shape for the dog-ear
    # Points: Top-Left -> Top-Right-Fold-Start -> Fold-Inner -> Right-Side-Fold-End -> Bottom-Right -> Bottom-Left
    
    # Let's simplify: Draw full rounded rect, then overlay the fold
    draw.rounded_rectangle(
        (paper_x1, paper_y1, paper_x2, paper_y2),
        radius=4*scale,
        fill="white"
    )
    
    # Dog-ear (Top Right)
    # Fold size: 20 units
    fold_size = 20 * scale
    fold_x = paper_x2 - fold_size
    fold_y = paper_y1 + fold_size
    
    # Cut out the corner (white triangle to hide the corner)
    # Actually, simpler to just draw the fold on top if the background matches, 
    # but here the background is complex.
    # Better to draw the polygon for the paper explicitly.
    
    # Let's stick to the rounded rect for simplicity and just draw the fold on top
    # It might look like a "folded over" piece.
    
    # Fold triangle
    # (paper_x2, paper_y1 + fold_size) -> (paper_x2 - fold_size, paper_y1) -> (paper_x2 - fold_size, paper_y1 + fold_size)
    fold_points = [
        (paper_x2, paper_y1 + fold_size),
        (paper_x2 - fold_size, paper_y1),
        (paper_x2 - fold_size, paper_y1 + fold_size)
    ]
    draw.polygon(fold_points, fill="#F0F0F0") # Light gray for back of paper
    
    # Shadow under the fold
    # draw.line([(paper_x2 - fold_size, paper_y1), (paper_x2, paper_y1 + fold_size)], fill=(0,0,0,20), width=1)

    # 3. Lines
    # Line 1: Pink (Marker) #FF69B4
    # Line 2: Gray #DDDDDD
    # Line 3: Gray #DDDDDD
    
    line_x1 = 30 * scale
    line_x2 = 70 * scale
    line_width = 6 * scale
    
    # Top Line (Pink)
    draw_round_line(draw, (line_x1, 40*scale, line_x2, 40*scale), "#FF69B4", line_width)
    
    # Middle Line (Gray)
    draw_round_line(draw, (line_x1, 55*scale, line_x2, 55*scale), "#DDDDDD", line_width)
    
    # Bottom Line (Gray, shorter)
    draw_round_line(draw, (line_x1, 70*scale, 55*scale, 70*scale), "#DDDDDD", line_width)

    # Save
    bg.save("public/icon.png", "PNG")
    print("Icon generated successfully: public/icon.png")

if __name__ == "__main__":
    generate_icon()
