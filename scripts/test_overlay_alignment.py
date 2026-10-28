import cv2
import numpy as np

# Load static island
island_rgba = cv2.imread('frontend/public/assets/dao_dia_hinh/island_forest_beginnings.png', cv2.IMREAD_UNCHANGED)
w_static = 300 # suppose rendered static width is 300px
h_static = int(w_static * (275 / 338)) # 244px
resized_static = cv2.resize(island_rgba, (w_static, h_static))

# Read video frame
cap = cv2.VideoCapture('frontend/public/assets/animation/forest-island.mp4')
ret, frame = cap.read()
cap.release()

# Read mask
mask = cv2.imread('frontend/public/assets/animation/forest-island-mask.png', cv2.IMREAD_UNCHANGED)
frame_rgba = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
frame_rgba[:, :, 3] = mask[:, :, 3]

# Now simulate CSS:
# video width = 157.07% of static width
# video height = video width * (784 / 1168)
w_video = int(w_static * 1.5707)
h_video = int(w_video * 784 / 1168)
resized_video = cv2.resize(frame_rgba, (w_video, h_video))

# Centered at (w_static/2, h_static/2)
# Canvas with parchment background
bg_color = (210, 230, 240, 255) # light ocean/parchment color
canvas_static = np.full((h_static + 60, w_static + 60, 4), bg_color, dtype=np.uint8)
canvas_video = np.full((h_static + 60, w_static + 60, 4), bg_color, dtype=np.uint8)

# Place static island in canvas_static at margin 30, 30
ox, oy = 30, 30
for c in range(3):
    canvas_static[oy:oy+h_static, ox:ox+w_static, c] = (
        resized_static[:, :, c] * (resized_static[:, :, 3]/255.0) +
        canvas_static[oy:oy+h_static, ox:ox+w_static, c] * (1.0 - resized_static[:, :, 3]/255.0)
    )

# Place video in canvas_video
# center of static is ox + w_static/2, oy + h_static/2
cx = ox + w_static // 2
cy = oy + h_static // 2
vx = cx - w_video // 2
vy = cy - h_video // 2

# overlay video
for y in range(h_video):
    for x in range(w_video):
        cy_pos = vy + y
        cx_pos = vx + x
        if 0 <= cy_pos < canvas_video.shape[0] and 0 <= cx_pos < canvas_video.shape[1]:
            alpha = resized_video[y, x, 3] / 255.0
            for c in range(3):
                canvas_video[cy_pos, cx_pos, c] = (
                    resized_video[y, x, c] * alpha +
                    canvas_video[cy_pos, cx_pos, c] * (1.0 - alpha)
                )

# Blend side by side and diff
comparison = np.hstack([canvas_static, canvas_video])
cv2.imwrite('C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81/island_alignment_test.png', comparison)
print("Saved island_alignment_test.png successfully!")
