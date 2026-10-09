# Renders top-down vehicle sprites for the ops demo-fleet map.
# Run: blender -b -P apps/ops/scripts/render-demo-vehicles.py -- apps/ops/public/demo-fleet/vehicles
# (then update SPRITES in components/maps/demo-fleet/demo-fleet-layer.tsx from
# the META line it prints if any dimensions changed)
import bpy, bmesh, math, sys, json, os
from mathutils import Vector

OUT = sys.argv[sys.argv.index("--") + 1]
os.makedirs(OUT, exist_ok=True)
PX_PER_M = 64.0


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    s.cycles.samples = 96
    s.cycles.use_denoising = True
    s.render.film_transparent = True
    s.view_settings.view_transform = "Standard"
    s.view_settings.look = "None"
    s.view_settings.exposure = 0.0
    s.render.image_settings.file_format = "PNG"
    s.render.image_settings.color_mode = "RGBA"
    s.render.image_settings.compression = 100
    w = bpy.data.worlds.new("w")
    s.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.76, 0.78, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.3
    return s


def mat(name, color, rough=0.35, metal=0.0, coat=0.0, emit=None, emit_strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = 0.05
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = emit_strength
    return m


def rrect(hl, hw, rf, rr, cy=0.0, n=8):
    """Plan-view rounded rectangle, front (+Y) corners radius rf, rear rr."""
    pts = []
    corners = [  # (cx, cy, r, start_angle)
        (hw - rf, cy + hl - rf, rf, 0),
        (-hw + rf, cy + hl - rf, rf, 90),
        (-hw + rr, cy - hl + rr, rr, 180),
        (hw - rr, cy - hl + rr, rr, 270),
    ]
    for x, y, r, a0 in corners:
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((x + r * math.cos(a), y + r * math.sin(a)))
    return pts


def loft(name, rings, material, cap=True, bevel=0.0, bevel_segs=4):
    """rings: list of (points2d, z). Builds a closed lofted solid."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vrings = [[bm.verts.new((x, y, z)) for x, y in pts] for pts, z in rings]
    n = len(vrings[0])
    for a, b in zip(vrings, vrings[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap:
        bm.faces.new(list(reversed(vrings[0])))
        bm.faces.new(vrings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material)
    if bevel:
        md = ob.modifiers.new("bevel", "BEVEL")
        md.width = bevel
        md.segments = bevel_segs
        md.limit_method = "ANGLE"
        md.angle_limit = math.radians(35)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def box(name, size, loc, material, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(material)
    if bevel:
        md = ob.modifiers.new("bevel", "BEVEL")
        md.width = bevel
        md.segments = 3
    bpy.ops.object.shade_smooth()
    return ob


def sphere(name, r, loc, material, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=32, ring_count=16)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = scale
    ob.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return ob


def cyl(name, r, depth, loc, rot, material):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=24)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return ob


def stage(w_m, h_m):
    s = bpy.context.scene
    # Shadow catcher floor: soft contact shadow, transparent everywhere else.
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    bpy.context.active_object.is_shadow_catcher = True
    # Big soft light straight overhead so the shadow sits centred under the
    # vehicle — the sprite gets rotated in CSS, so a directional shadow would
    # swing around with the heading.
    bpy.ops.object.light_add(type="AREA", location=(0, 0, 9))
    l = bpy.context.active_object
    l.data.size = 7
    l.data.energy = 520
    # Low key light from the front-left for a specular sweep on the paint.
    bpy.ops.object.light_add(type="AREA", location=(-4, 5, 6))
    k = bpy.context.active_object
    k.data.size = 3
    k.data.energy = 140
    k.rotation_euler = (math.radians(-35), math.radians(-30), 0)
    bpy.ops.object.camera_add(location=(0, 0, 30), rotation=(0, 0, 0))
    cam = bpy.context.active_object
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = max(w_m, h_m)
    cam.data.clip_end = 100
    s.camera = cam
    s.render.resolution_x = round(w_m * PX_PER_M)
    s.render.resolution_y = round(h_m * PX_PER_M)
    s.render.resolution_percentage = 100


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


meta = {}

# ---------------------------------------------------------------- taxi saloon
CAR_W, CAR_H = 2.6, 5.4
SIGN = dict(w=0.2, l=1.0, cy=-0.25)
for variant, paint, metal in [
    ("white", (0.86, 0.86, 0.84), 0.0),
    ("silver", (0.55, 0.57, 0.6), 0.6),
    ("graphite", (0.09, 0.095, 0.11), 0.4),
]:
    reset()
    body_m = mat("paint", paint, rough=0.28, metal=metal, coat=1.0)
    glass_m = mat("glass", (0.02, 0.025, 0.035), rough=0.04, coat=1.0)
    trim_m = mat("trim", (0.03, 0.03, 0.035), rough=0.5)
    sign_m = mat("sign", (0.05, 0.05, 0.06), rough=0.25, coat=0.6)
    head_m = mat("head", (0.9, 0.9, 0.85), rough=0.1, emit=(1, 0.95, 0.85), emit_strength=1.5)
    tail_m = mat("tail", (0.5, 0.02, 0.02), rough=0.2, emit=(1, 0.05, 0.03), emit_strength=0.8)

    # Body: rounded plan outline, hood and boot dropped so the overhead light
    # grades across them the way a real car's panels do.
    plan = rrect(2.28, 0.9, 0.42, 0.32)
    top = [(x, y) for x, y in rrect(2.2, 0.84, 0.4, 0.3)]
    rings = [(plan, 0.3), (plan, 0.85), (top, 1.0)]
    body = loft("body", rings, body_m, bevel=0.06)
    for v in body.data.vertices:
        if v.co.z > 0.9:
            if v.co.y > 0.95:
                v.co.z -= 0.1 * min(1, (v.co.y - 0.95) / 1.2)
            if v.co.y < -1.55:
                v.co.z -= 0.06 * min(1, (-1.55 - v.co.y) / 0.6)

    # Greenhouse: slanted glass, then a painted roof panel inset on top.
    cab_lo = rrect(1.28, 0.8, 0.3, 0.3, cy=-0.15)
    cab_hi = rrect(0.82, 0.68, 0.22, 0.22, cy=-0.25)
    loft("cabin", [(cab_lo, 0.97), (cab_hi, 1.42)], glass_m, bevel=0.04)
    roof = rrect(0.74, 0.62, 0.2, 0.2, cy=-0.25)
    loft("roof", [(roof, 1.41), (rrect(0.7, 0.58, 0.18, 0.18, cy=-0.25), 1.46)], body_m, bevel=0.03)

    # Taxi-top unit: the double-sided 960x320mm screen stands on the roof,
    # long axis along the car. From above you see its top edge.
    box("sign", (SIGN["w"], SIGN["l"], 0.3), (0, SIGN["cy"], 1.62), sign_m, bevel=0.03)

    for sx in (-1, 1):
        box("mirror", (0.2, 0.1, 0.1), (sx * 0.98, 0.72, 0.98), body_m, bevel=0.03)
        box("head", (0.34, 0.08, 0.08), (sx * 0.58, 2.22, 0.82), head_m)
        box("tail", (0.36, 0.06, 0.07), (sx * 0.6, -2.25, 0.86), tail_m)
    box("grille", (0.7, 0.04, 0.08), (0, 2.27, 0.66), trim_m)

    stage(CAR_W, CAR_H)
    render(os.path.join(OUT, f"taxi-{variant}.png"))

ppm = PX_PER_M
meta["taxi"] = {
    "width": round(CAR_W * ppm),
    "height": round(CAR_H * ppm),
    # Sign footprint as % of the sprite, for the CSS "lit screen" overlay.
    "screen": {
        "left": round(50 - SIGN["w"] / 2 / CAR_W * 100, 2),
        "top": round(50 - (SIGN["cy"] + SIGN["l"] / 2) / CAR_H * 100, 2),
        "width": round(SIGN["w"] / CAR_W * 100, 2),
        "height": round(SIGN["l"] / CAR_H * 100, 2),
    },
}

# --------------------------------------------------------- delivery motorbike
# Modelled ~1.35x real size: at true scale a bike is a speck next to a car
# and too small to click on the map.
K = 1.35
BIKE_W, BIKE_H = 1.5, 3.0
BOX = dict(s=0.46 * K, cy=-0.62 * K)
reset()
frame_m = mat("frame", (0.1, 0.1, 0.11), rough=0.35, coat=0.8)
tank_m = mat("tank", (0.62, 0.16, 0.09), rough=0.25, coat=1.0)
tyre_m = mat("tyre", (0.02, 0.02, 0.02), rough=0.8)
seat_m = mat("seat", (0.04, 0.04, 0.04), rough=0.6)
jacket_m = mat("jacket", (0.08, 0.2, 0.16), rough=0.7)
helmet_m = mat("helmet", (0.85, 0.85, 0.82), rough=0.15, coat=1.0)
visor_m = mat("visor", (0.02, 0.02, 0.03), rough=0.05, coat=1.0)
box_m = mat("box", (0.05, 0.05, 0.06), rough=0.3, coat=0.6)
chrome_m = mat("chrome", (0.8, 0.8, 0.8), rough=0.15, metal=1.0)

box("tyre_f", (0.12 * K, 0.6 * K, 0.6 * K), (0, 0.78 * K, 0.3 * K), tyre_m, bevel=0.05)
box("tyre_r", (0.14 * K, 0.6 * K, 0.6 * K), (0, -0.72 * K, 0.3 * K), tyre_m, bevel=0.05)
box("fender", (0.16 * K, 0.42 * K, 0.06 * K), (0, 0.8 * K, 0.64 * K), frame_m, bevel=0.03)
box("frame", (0.22 * K, 1.2 * K, 0.2 * K), (0, 0.0, 0.62 * K), frame_m, bevel=0.05)
sphere("tank", 0.2 * K, (0, 0.34 * K, 0.82 * K), tank_m, scale=(0.85, 1.4, 0.6))
box("seat", (0.26 * K, 0.62 * K, 0.08 * K), (0, -0.2 * K, 0.86 * K), seat_m, bevel=0.04)
cyl("bar", 0.025 * K, 0.72 * K, (0, 0.55 * K, 1.05 * K), (0, math.radians(90), 0), chrome_m)
for sx in (-1, 1):
    cyl("grip", 0.035 * K, 0.12 * K, (sx * 0.34 * K, 0.55 * K, 1.05 * K), (0, math.radians(90), 0), tyre_m)
    box("mirror", (0.08 * K, 0.05 * K, 0.03 * K), (sx * 0.3 * K, 0.6 * K, 1.25 * K), chrome_m, bevel=0.01)
    # Arms from shoulders down to the grips.
    a = Vector((sx * 0.22 * K, 0.02 * K, 1.32 * K))
    b = Vector((sx * 0.32 * K, 0.52 * K, 1.08 * K))
    d = b - a
    arm = cyl("arm", 0.055 * K, d.length, (a + b) / 2, (0, 0, 0), jacket_m)
    arm.rotation_mode = "QUATERNION"
    arm.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
# Rider: torso leaning forward, helmet on top.
sphere("torso", 0.24 * K, (0, -0.05 * K, 1.3 * K), jacket_m, scale=(1.15, 0.75, 1.0))
sphere("helmet", 0.14 * K, (0, 0.1 * K, 1.62 * K), helmet_m, scale=(0.95, 1.1, 1.0))
sphere("visor", 0.1 * K, (0, 0.2 * K, 1.6 * K), visor_m, scale=(1.1, 0.7, 0.6))
# Three-sided 320x320mm screen box on the rear rack.
box("screenbox", (BOX["s"], BOX["s"], BOX["s"]), (0, BOX["cy"], 0.9 * K + BOX["s"] / 2), box_m, bevel=0.03)

stage(BIKE_W, BIKE_H)
render(os.path.join(OUT, "bike.png"))
meta["bike"] = {
    "width": round(BIKE_W * ppm),
    "height": round(BIKE_H * ppm),
    "screen": {
        "left": round(50 - BOX["s"] / 2 / BIKE_W * 100, 2),
        "top": round(50 - (BOX["cy"] + BOX["s"] / 2) / BIKE_H * 100, 2),
        "width": round(BOX["s"] / BIKE_W * 100, 2),
        "height": round(BOX["s"] / BIKE_H * 100, 2),
    },
}

print("META", json.dumps(meta))
