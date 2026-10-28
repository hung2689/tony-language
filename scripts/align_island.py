import cv2
import numpy as np

# Load transparent PNG island
island_rgba = cv2.imread('frontend/public/assets/dao_dia_hinh/island_forest_beginnings.png', cv2.IMREAD_UNCHANGED)
# Island shape is (275, 338, 4)
h_isl, w_isl = island_rgba.shape[:2]
alpha_channel = island_rgba[:, :, 3]

# Read video frame
cap = cv2.VideoCapture('frontend/public/assets/animation/forest-island.mp4')
ret, frame = cap.read()
cap.release()
h_vid, w_vid = frame.shape[:2]

print(f"Island RGBA size: {w_isl}x{h_isl}")
print(f"Video size: {w_vid}x{h_vid}")

# In the video, the island is centered at approx cx=590, cy=383 with scale approx 2.20
# Let's verify by finding the best template match between the resized island (RGB) and frame
island_bgr = island_rgba[:, :, :3]
island_mask = (alpha_channel > 50).astype(np.uint8) * 255

best_val = -1
best_scale = 1.0
best_loc = (0, 0)

for s in np.linspace(2.0, 2.4, 21):
    resized_isl = cv2.resize(island_bgr, (0, 0), fx=s, fy=s)
    resized_msk = cv2.resize(island_mask, (0, 0), fx=s, fy=s)
    res = cv2.matchTemplate(frame, resized_isl, cv2.TM_CCORR_NORMED, mask=resized_msk)
    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)
    if max_val > best_val:
        best_val = max_val
        best_scale = s
        best_loc = max_loc

print(f"Best match score: {best_val:.4f} at scale {best_scale:.3f}, loc: {best_loc}")
rx, ry = best_loc
rw = int(w_isl * best_scale)
rh = int(h_isl * best_scale)
print(f"Island in video bounding box: x={rx}..{rx+rw}, y={ry}..{ry+rh}")
print(f"Video center: ({w_vid/2}, {h_vid/2}), Island center in video: ({rx + rw/2}, {ry + rh/2})")
print(f"Offsets from center: dx={rx + rw/2 - w_vid/2:.1f}, dy={ry + rh/2 - h_vid/2:.1f}")

# Notice how close the island is to the dead-center of the video!
# Video is 1168 x 784 -> center is 584, 392.
# Island center is ~ 590, 383 -> only 6px horizontal and 9px vertical difference! (less than 1% offset!)

# Now let's create a perfect mask for the video:
# If we scale the island's alpha mask and place it at (rx, ry) on an 1168x784 canvas,
# and dilate/feather it slightly so it captures the outer shore / water splash of the video:
video_mask = np.zeros((h_vid, w_vid), dtype=np.uint8)
resized_alpha = cv2.resize(alpha_channel, (rw, rh), interpolation=cv2.INTER_LINEAR)

# Place into video mask
video_mask[ry:ry+rh, rx:rx+rw] = resized_alpha

# Dilate slightly (e.g. 15-20 pixels) to include the beautiful shore waves generated in the video
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35))
dilated_mask = cv2.dilate(video_mask, kernel)
# Feather the edges with Gaussian blur so there are zero hard cuts
feathered_mask = cv2.GaussianBlur(dilated_mask, (41, 41), 0)

# Save mask as RGBA (where RGB=255 and A=feathered_mask) so it works as CSS mask-image: url(...)
mask_rgba = np.zeros((h_vid, w_vid, 4), dtype=np.uint8)
mask_rgba[:, :, :3] = 255
mask_rgba[:, :, 3] = feathered_mask

cv2.imwrite('frontend/public/assets/animation/forest-island-mask.png', mask_rgba)
print("Saved frontend/public/assets/animation/forest-island-mask.png successfully!")

# Also let's save a preview of masked video frame
preview = frame.copy()
preview_rgba = cv2.cvtColor(preview, cv2.COLOR_BGR2BGRA)
preview_rgba[:, :, 3] = feathered_mask
cv2.imwrite('C:/Users/ASUS/.gemini/antigravity/brain/fb170049-df20-49df-8f27-4afe305d9a81/preview_masked_island.png', preview_rgba)
print("Saved preview_masked_island.png to artifact dir!")
