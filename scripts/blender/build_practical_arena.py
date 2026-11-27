"""Build CAPABLE's training bench with Blender 5.2.

blender --background --factory-startup --python scripts/blender/build_practical_arena.py -- --preview
The model uses web coordinates throughout this source (X right, Y up, Z toward the operator).
"""
import argparse
import json
import math
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Vector
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
ASSET = ROOT / 'app/src/capable/assets/practical-arena'
PREVIEW = ROOT / 'outputs/capable-qa/blender-preview.png'
ASSET.mkdir(parents=True, exist_ok=True)
CAMERAS = {
    'overview': {'label':'Overview','anchor':'Camera_Overview','target':[0,-.73,.50],'position':[3.6,2.65,12.8],'fit':[10.7,7.55]},
    'circuit': {'label':'Circuit','anchor':'Camera_Circuit','target':[-1.95,-.18,.52],'position':[-.85,1.55,10.4],'fit':[4.76,3.43]},
    'multimeter': {'label':'Multimeter','anchor':'Camera_Multimeter','target':[2.66,-1.05,1.63],'position':[4.0,.08,9.6],'fit':[3.6,2.48]},
}


def xyz(point):
    x, y, z = point
    return (x, -z, y)


def srgb(value):
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4


def color(value):
    return tuple(srgb(int(value[i:i+2], 16) / 255) for i in (0, 2, 4))


def image(name, rgb, alpha=None):
    h, w = rgb.shape[:2]
    asset = bpy.data.images.new(name, width=w, height=h, alpha=alpha is not None)
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[:, :, :3] = np.clip(rgb, 0, 1)
    if alpha is not None:
        rgba[:, :, 3] = alpha
    asset.pixels.foreach_set(rgba.ravel())
    asset.update()
    asset.pack()
    return asset


def grain(name, size, tint, seed, brushed=False):
    rng = np.random.default_rng(seed)
    yy, xx = np.indices((size, size), dtype=np.float32)
    noise = rng.normal(0, .045 if brushed else .065, (size, size)).astype(np.float32)
    speckle = rng.normal(0, .09, (size, 1 if brushed else size)).astype(np.float32)
    tone = 1 + .32 * speckle + noise + .035*np.sin(xx * .031 + yy * .021) + .04*np.sin(xx * .004 - yy * .012)
    # Sparse irregular abrasion, visible only at close range.
    for _ in range(42):
        y = rng.integers(0, size - 2)
        x = rng.integers(0, size - 35)
        length = rng.integers(9, 35)
        tone[y:y + 1, x:x + length] += rng.uniform(-.14, .16) * np.sin(np.linspace(0, math.pi, length))
    return image(name, tone[:, :, None] * np.array(color(tint)))


def material(name, tint, rough=.56, metal=0, texture=None, coat=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color(tint), 1)
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Coat Weight'].default_value = coat
    if texture:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = texture
        mat.node_tree.links.new(tex.outputs['Color'], shader.inputs['Base Color'])
    return mat


def contact_material():
    yy, xx = np.indices((256, 256), dtype=np.float32) / 127.5 - 1
    r = np.sqrt(xx**2 + yy**2)
    alpha = np.maximum(0, 1 - r**2)**3 * .49
    tex = image('Baked contact falloff 256', np.ones((256, 256, 3), dtype=np.float32) * .014, alpha)
    mat = material('Baked contact occlusion', '222729')
    mat.surface_render_method = 'DITHERED'
    shader = mat.node_tree.nodes.get('Principled BSDF')
    node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = tex
    mat.node_tree.links.new(node.outputs['Alpha'], shader.inputs['Alpha'])
    return mat


BATCH = {}


def empty(name, pos=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = xyz(pos)
    obj.empty_display_size = .12
    return obj


def mesh(name, points, faces, parent, mat, *, pos=(0, 0, 0), bevel=0, smooth=False, uv=None, batch=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata([xyz(p) for p in points], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = xyz(pos)
    data.materials.append(mat)
    if uv:
        layer = data.uv_layers.new()
        for face in data.polygons:
            for loop_i, coord in zip(face.loop_indices, uv[face.index]):
                layer.data[loop_i].uv = coord
    if bevel:
        edge = obj.modifiers.new('Formed edge radius', 'BEVEL')
        edge.width = bevel
        edge.segments = 2
        edge.harden_normals = True
        smooth = True
    if smooth:
        for face in data.polygons:
            face.use_smooth = True
        if bevel:
            normal = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
            normal.keep_sharp = True
    if batch:
        BATCH.setdefault((parent, mat), []).append(obj)
    return obj


RECT = ((0, 0), (1, 0), (1, 1), (0, 1))


def box(name, parent, pos, size, mat, bevel=.025, batch=True):
    x, y, z = (a / 2 for a in size)
    return mesh(name, [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)],
                [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],
                parent, mat, pos=pos, bevel=bevel, uv=[RECT]*6, batch=batch)


def lathe(name, parent, pos, profile, mat, *, axis='z', sides=24, batch=True):
    coords = []
    for depth, radius in profile:
        for i in range(sides):
            theta = i * math.tau / sides
            a, b = radius * math.cos(theta), radius * math.sin(theta)
            coords.append((a, b, depth) if axis == 'z' else (depth, a, b) if axis == 'x' else (a, depth, -b))
    faces = [(row*sides+i, row*sides+(i+1)%sides, (row+1)*sides+(i+1)%sides, (row+1)*sides+i)
             for row in range(len(profile)-1) for i in range(sides)]
    faces += [tuple(reversed(range(sides))), tuple((len(profile)-1)*sides+i for i in range(sides))]
    return mesh(name, coords, faces, parent, mat, pos=pos, smooth=True, batch=batch)


def screw(parent, p, r=.056):
    x, y, z = p
    lathe('Turned screw head', parent, p, [(-.024,r*.77),(-.008,r),(.012,r),(.023,r*.72)], STEEL, sides=12)
    box('Recess', parent, (x, y, z+.023), (r*1.06, r*.24, .003), DARK, .001)
    box('Recess', parent, (x, y, z+.023), (r*.24, r*.85, .003), DARK, .001)


def cable(name, parent, points, mat, radius=.037):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 7
    data.bevel_depth = radius
    data.bevel_resolution = 2
    data.use_fill_caps = True
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for item, point in zip(spline.bezier_points, points):
        item.co = xyz(point)
        item.handle_left_type = item.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    data.materials.append(mat)
    BATCH.setdefault((parent, mat), []).append(obj)
    return obj


def label(text, parent, pos, size, mat, *, center=False):
    data = bpy.data.curves.new(text, 'FONT')
    data.body = text
    data.font = FONT
    data.size = size
    data.resolution_u = 4
    data.align_x = 'CENTER' if center else 'LEFT'
    obj = bpy.data.objects.new(text, data)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = xyz(pos)
    obj.rotation_euler = (math.pi / 2, 0, 0)
    data.materials.append(mat)
    BATCH.setdefault((parent, mat), []).append(obj)


def decal(parent, pos, size, title, plate, ink, fontsize):
    x,y,z = pos
    box('Printed legend plate', parent, pos, (*size, .018), plate, .01)
    label(title, parent, (x,y-fontsize*.30,z+.011), fontsize, ink, center=True)


def shadow(name, parent, center, width, height, floor=False):
    x,y,z = center
    coords = [(-width/2,-height/2,0),(width/2,-height/2,0),(width/2,height/2,0),(-width/2,height/2,0)]
    if floor:
        coords = [(a, 0, -b) for a,b,_ in coords]
    mesh(name, coords, [(0,1,2,3)], parent, CONTACT, pos=(x,y,z), uv=[RECT])


def batch_geometry():
    deps = bpy.context.evaluated_depsgraph_get()
    for (parent, mat), objects in BATCH.items():
        converted = []
        for old in objects:
            geom = bpy.data.meshes.new_from_object(old.evaluated_get(deps), preserve_all_data_layers=True, depsgraph=deps)
            new = bpy.data.objects.new(old.name + ' mesh', geom)
            bpy.context.collection.objects.link(new)
            new.parent = parent
            new.matrix_basis = old.matrix_basis.copy()
            converted.append(new)
        for old in objects:
            bpy.data.objects.remove(old, do_unlink=True)
        bpy.ops.object.select_all(action='DESELECT')
        for obj in converted:
            obj.select_set(True)
        active = converted[0]
        bpy.context.view_layer.objects.active = active
        if len(converted) > 1:
            bpy.ops.object.join()
        active.name = parent.name + ' · ' + mat.name
    bpy.ops.object.select_all(action='DESELECT')


def equipment():
    root = empty('CAPABLE_Workbench')
    bench = empty('Workbench', parent=root)
    tabletop = empty('Tabletop', parent=bench)
    box('High-pressure laminate', tabletop, (0,-1.92,1.33), (9.12,.23,3.96), WORKTOP, .085)
    box('Edge band', bench, (0,-2.06,1.33), (9.07,.09,3.92), DARK, .03)
    frame = empty('PowderCoatedFrame', parent=bench)
    for x in (-4.12,4.12):
        for z in (-.23,2.94):
            box('Square steel upright',frame,(x,-2.88,z),(.25,1.64,.26),FRAME,.034)
            box('Rubber leveling foot',frame,(x,-3.73,z),(.40,.13,.40),RUBBER,.048)
            box('Welded mounting flange',frame,(x,-2.17,z),(.58,.085,.52),FRAME,.028)
        box('Cross member',frame,(x,-3.40,1.35),(.22,.16,2.98),FRAME,.03)
    box('Lower stretcher',frame,(0,-3.43,-.24),(8.04,.15,.19),FRAME,.026)
    box('Front apron',frame,(0,-2.24,3.0),(8.1,.24,.20),FRAME,.032)
    decal(bench, (0,-2.27,3.115), (2.45,.20), 'CAPABLE   •   LAMP CIRCUIT TRAINER', DARK, IVORY, .095)
    wall = empty('WorkshopSurround', parent=root)
    box('Workshop floor',wall,(0,-3.83,.5),(200,.09,160),FLOOR,.0)
    box('Rear wall',wall,(0,4.0,-4.4),(100,22,.2),WALL,.0)
    for x in (-4.12,4.12):
        for z in (-.23,2.94):
            shadow('Foot contact',wall,(x,-3.778,z),1.25,1.1,True)
    shadow('Bench contact',wall,(0,-3.777,1.2),12,6,True)

    plate = empty('Backplate', parent=root)
    box('Painted trainer chassis',plate,(0,.2,-.49),(8.38,4.19,.28),FRAME,.065)
    box('Satin removable steel plate',plate,(0,.18,-.323),(8.13,3.93,.074),GALV,.026)
    for x in (-3.93,3.93):
        box('Upright stiffener',plate,(x,.16,-.235),(.095,3.84,.11),FRAME,.018)
        for i in range(13):
            y = -1.48+i*.259
            lathe('Pressed hole liner',plate,(x,y,-.166),[(-.012,.041),(.006,.04)],DARK,sides=12)
        for y in (-1.7,1.87):
            screw(plate,(x,y,-.142),.07)
    for x in (-3.75,3.75):
        box('Table mounting angle',plate,(x,-1.70,-.11),(.27,.26,.265),STEEL,.024)
    decal(plate,(.43,1.86,-.26),(5.30,.26),'CAPABLE  /  ELECTRICAL TRAINING UNIT',FRAME,IVORY,.14)
    decal(plate,(2.50,1.56,-.26),(1.68,.17),'EL-21  |  SIMULATION ONLY',IVORY,DARK,.079)
    shadow('Cabinet contact',plate,(-2.02,-.28,-.282),4.25,3.35)
    shadow('Switch contact',plate,(.64,-.72,-.279),1.8,1.72)
    shadow('Lamp contact',plate,(2.32,.82,-.279),2.04,1.98)

    cabinet = empty('CabinetShell', parent=root)
    box('Recessed enclosure rear',cabinet,(-2.05,-.24,-.10),(3.37,2.80,.25),CABINET,.052)
    box('Inset metal panel',cabinet,(-2.05,-.24,.042),(3.10,2.53,.068),INNER,.021)
    for x in (-3.68,-.42):
        box('Folded cabinet wall',cabinet,(x,-.24,.37),(.13,2.81,.91),CABINET,.04)
        box('Compression gasket',cabinet,(x,-.24,.80),(.06,2.58,.04),RUBBER,.017)
    for y in (-1.58,1.11):
        box('Folded cabinet wall',cabinet,(-2.05,y,.36),(3.24,.13,.9),CABINET,.038)
        box('Compression gasket',cabinet,(-2.05,y,.80),(3.11,.055,.041),RUBBER,.015)
    for x in (-3.59,-.57):
        for y in (1.02,-1.45):
            screw(cabinet,(x,y,.80),.055)
    for y in (-.98,.62):
        box('Barrel hinge mount',cabinet,(-3.74,y,.77),(.24,.33,.16),FRAME,.038)
        screw(cabinet,(-3.77,y,.882),.043)

    rails = empty('DINRails', parent=root)
    for y in (.39,-.78):
        box('DIN hat rail base',rails,(-2.05,y,.125),(2.99,.22,.10),STEEL,.014)
        for edge in (-.105,.105):
            box('Returned DIN flange',rails,(-2.05,y+edge,.20),(3.00,.04,.071),STEEL,.012)
        for x in (-3.39,-.71):
            screw(rails,(x,y,.189),.049)
    for x in (-3.45,-.64):
        box('Slotted cable duct',rails,(x,-.2,.225),(.19,2.17,.23),DUCT,.025)
        for i in range(13):
            box('Duct slot',rails,(x,-1.13+i*.148,.343),(.13,.033,.008),DARK,.008)

    door = empty('CabinetDoor', (-3.75,-.24,.84), parent=root)
    box('Powder-coated door panel',door,(1.69,0,.032),(3.38,2.74,.132),CABINET,.087)
    box('Reinforced inset',door,(1.69,0,.111),(3.12,2.49,.045),COVER,.041)
    for x in (.20,3.18):
        for y in (-1.12,1.12):
            screw(door,(x,y,.156),.054)
    for y in (-.74,.86):
        box('Hinge leaf',door,(.07,y,-.076),(.27,.29,.083),STEEL,.016)
        screw(door,(.16,y,-.023),.039)
    box('Interior recessed stiffener',door,(1.68,0,-.055),(3.08,2.45,.045),CABINET,.033)
    decal(door,(1.69,.79,.154),(2.62,.25),'DISTRIBUTION MODULE  /  EL-21',FRAME,IVORY,.107)
    decal(door,(1.99,-.14,.155),(1.30,.45),'DANGER',WARNING,DARK,.192)
    decal(door,(1.99,-.49,.154),(1.37,.19),'SIMULATION ONLY',DARK,IVORY,.087)
    decal(door,(.64,-.53,.156),(.71,.17),'MAIN ISOLATOR',DARK,IVORY,.079)
    box('Insulated exterior isolator bezel',door,(.63,-.10,.18),(.50,.61,.09),RUBBER,.032)
    mcb_out = empty('ExteriorBreakerLever',(.63,-.09,.27),parent=door)
    box('Front breaker control',mcb_out,(0,0,0),(.32,.27,.155),RED,.034)
    for y in (-.06,0,.06):
        box('Molded grip ridge',mcb_out,(0,y,.086),(.24,.024,.018),RUBBER,.006)
    empty('Hit_Cover',(1.69,0,.174),parent=door)
    empty('Hit_BreakerExterior',(0,0,.095),parent=mcb_out)

    breaker = empty('MCB', (-3.10,.045,.24), parent=root)
    box('Breaker molded shell',breaker,(0,0,.17),(.54,.93,.33),IVORY,.049)
    box('Mold seam',breaker,(0,0,.337),(.50,.82,.035),PLASTIC,.023)
    box('Actuator recess',breaker,(0,.03,.368),(.34,.39,.039),DARK,.024)
    lever = empty('BreakerLever',(0,.035,.426),parent=breaker)
    box('MCB actuator',lever,(0,-.024,.015),(.26,.23,.13),PLASTIC,.024)
    box('Indicator strip',lever,(0,.025,.091),(.17,.039,.014),RED,.008)
    label('MCB',breaker,(-.170,.27,.371),.091,DARK)
    label('B 06',breaker,(-.164,-.31,.371),.076,DARK)
    empty('Hit_BreakerInterior',(0,0,.12),parent=lever)

    terminal_group = empty('TerminalBlocks',parent=root)
    points = {
        'line':('Probe_Line', -3.10,.72,'L',RED), 'fuse-in':('Probe_FuseIn',-2.43,.72,'F1',BLACK),
        'fuse-out':('Probe_FuseOut',-1.71,.72,'F2',RED), 'switch-out':('Probe_SwitchOut',-.98,.72,'L2',RED),
        'lamp-n':('Probe_LampN',-2.43,-.75,'N2',BLUE), 'neutral':('Probe_Neutral',-1.71,-.75,'N',BLUE),
        'earth':('Probe_Earth',-.98,-.75,'PE',GREEN),
    }
    for node, x,y, text, tint in points.values():
        box('Snap-fit terminal shell',terminal_group,(x,y,.36),(.36,.31,.37),tint,.036)
        box('Touch guard recess',terminal_group,(x,y,.553),(.25,.21,.02),DARK,.025)
        lathe('Brass terminal cup',terminal_group,(x,y,.571),[(-.030,.089),(.015,.089),(.022,.075)],BRASS,sides=16)
        lathe('Socket aperture',terminal_group,(x,y,.599),[(-.009,.043),(.003,.043)],DARK,sides=16)
        decal(terminal_group,(x,y+.231,.288),(.31,.124),text,IVORY,DARK,.076)
        empty(node, (x,y,.626), parent=terminal_group)

    fuse = empty('FuseAssembly',(-2.08,.056,.32),parent=root)
    box('Fuse socket base',fuse,(0,0,.021),(.91,.51,.29),DARK,.06)
    box('Fuse clip',fuse,(-.30,0,.21),(.12,.38,.123),BRASS,.024)
    box('Fuse clip',fuse,(.30,0,.21),(.12,.38,.123),BRASS,.024)
    cartridge = empty('FuseCartridge',(0,0,.259),parent=fuse)
    lathe('Ceramic fuse sleeve',cartridge,(0,0,0),[(-.31,.079),(-.185,.095),(.185,.095),(.31,.079)],IVORY,axis='x')
    for x in (-.26,.26):
        lathe('Nickel fuse ferrule',cartridge,(x,0,0),[(-.058,.083),(-.05,.104),(.05,.104),(.058,.083)],STEEL,axis='x')
    label('F 6 A',cartridge,(-.111,-.026,.100),.067,DARK)
    empty('Fault_Fuse',(0,0,.11),parent=cartridge)
    joint = empty('NeutralJoint',(-1.73,-1.125,.33),parent=root)
    box('Neutral return bus',joint,(0,0,.09),(.94,.25,.21),BLUE,.025)
    for x in (-.30,0,.30):
        screw(joint,(x,0,.215),.056)
    empty('Fault_Neutral',(0,0,.25),parent=joint)
    decal(cabinet,(-1.70,-1.35,.205),(.72,.16),'NEUTRAL',IVORY,DARK,.075)
    decal(cabinet,(-.92,-1.10,.199),(.42,.15),'EARTH',GREEN,IVORY,.074)

    wall_switch = empty('MainSwitch',(.57,-.61,-.19),parent=root)
    box('Surface pattress',wall_switch,(0,0,.127),(.87,1.12,.272),FRAME,.078)
    box('Molded switch plate',wall_switch,(0,0,.30),(.84,1.07,.13),IVORY,.066)
    box('Inset rocker frame',wall_switch,(0,.018,.378),(.48,.64,.071),RUBBER,.038)
    rocker = empty('WallSwitchRocker',(0,.017,.441),parent=wall_switch)
    box('Rocking contact actuator',rocker,(0,0,.012),(.32,.49,.115),PLASTIC,.035)
    box('Switch index',rocker,(0,.135,.077),(.065,.045,.012),IVORY,.006)
    for y in (-.43,.43):
        screw(wall_switch,(0,y,.381),.052)
    decal(wall_switch,(0,-.682,.059),(.90,.16),'LOAD SWITCH',FRAME,IVORY,.080)
    empty('Fault_Switch',(0,.012,.112),parent=rocker)

    lamp_holder = empty('LampHolder',(2.37,.72,-.21),parent=root)
    lathe('Pressed steel mounting rose',lamp_holder,(0,0,0),[(0,.56),(.043,.60),(.13,.56),(.23,.39),(.29,.31)],FRAME,sides=32)
    lathe('Porcelain holder',lamp_holder,(0,0,.28),[(0,.31),(.08,.29),(.19,.255),(.27,.25)],IVORY,sides=28)
    for x in (-.46,.46):
        screw(lamp_holder,(x,0,.168),.055)
    lamp = empty('Lamp',(0,0,.48),parent=lamp_holder)
    lathe('Threaded lamp base',lamp,(0,0,-.01),[(0,.19),(.10,.205),(.18,.205)],STEEL,sides=25)
    for k in range(3):
        lathe('Lamp cap thread',lamp,(0,0,.015+k*.036),[(0,.205),(.013,.218),(.023,.206)],STEEL,sides=25)
    lathe('Lamp shoulder',lamp,(0,0,.13),[(0,.21),(.10,.24),(.23,.34),(.29,.36)],IVORY,sides=32)
    lathe('LampDiffuser',lamp,(0,0,.382),[(0,.361),(.10,.352),(.20,.308),(.28,.234),(.33,.145),(.345,.03)],GLASS,sides=40,batch=False)
    empty('Fault_Lamp',(0,0,.62),parent=lamp)
    decal(plate,(2.38,-.03,-.267),(1.27,.17),'LAMP HOLDER',FRAME,IVORY,.087)

    wiring = empty('WiringAssembly',parent=root)
    cable('Insulated supply',wiring,[(-3.29,-1.51,.28),(-3.28,-.64,.44),(-3.24,.39,.41),(-3.10,.57,.50)],RED)
    cable('Protected feed',wiring,[(-3.09,.52,.42),(-2.86,.48,.41),(-2.56,.56,.42),(-2.44,.605,.51)],BLACK)
    cable('Fuse out conductor',wiring,[(-1.76,.15,.58),(-1.70,.29,.46),(-1.72,.63,.50)],RED)
    cable('Load conductor to trunking',wiring,[(-1.71,.575,.42),(-1.28,.35,.36),(-.69,.36,.31),(-.36,.29,.18)],RED)
    cable('Load return terminal',wiring,[(-2.44,-.61,.46),(-2.56,-.39,.33),(-2.13,-.37,.33),(-1.82,-1.06,.38)],BLUE)
    cable('Neutral bar connection',wiring,[(-1.40,-1.10,.39),(-1.34,-.92,.37),(-1.70,-.875,.48)],BLUE)
    cable('Earth bond',wiring,[(-.98,-.87,.44),(-.9,-1.02,.29),(-.71,-1.25,.22)],GREEN,.044)
    cable('Earth tracer',wiring,[(-.98,-.871,.483),(-.9,-1.02,.333),(-.71,-1.25,.262)],YELLOW,.012)
    trunk = empty('CableTrunking',parent=root)
    box('Horizontal conduit',trunk,(1.72,.32,-.157),(3.95,.19,.18),DUCT,.044)
    box('Vertical conduit',trunk,(3.65,.66,-.154),(.18,.88,.18),DUCT,.042)
    box('Vertical switch drop',trunk,(.575,-.063,-.155),(.18,.61,.17),DUCT,.027)
    for x in (-.12,.575,1.31,3.55):
        box('Retaining clip',trunk,(x,.32,-.038),(.09,.24,.09),FRAME,.020)
        screw(trunk,(x,.40,.015),.035)
    cable('Red lamp feed tail',wiring,[(.69,-.17,-.03),(.79,.17,-.038),(1.28,.22,-.061),(1.80,.22,-.063),(1.89,.56,.025)],RED)
    cable('Blue lamp return tail',wiring,[(3.57,.89,-.03),(3.31,.98,.03),(2.93,.83,.019)],BLUE)
    for x in (1.35,1.65,3.25):
        y = .22 if x < 2 else .96
        box('Cable saddle',trunk,(x,y,-.007),(.071,.125,.08),FRAME,.018)

    meter = empty('Multimeter',(3.20,-.98,1.64),parent=root)
    box('Meter base support',meter,(0,-.805,-.10),(1.44,.18,.77),FRAME,.08)
    box('Rubber bump guard',meter,(0,0,0),(1.37,1.66,.47),RUBBER,.135)
    box('Injection-molded front',meter,(0,0,.248),(1.18,1.48,.125),METER,.078)
    for x in (-.643,.643):
        for y in (-.36,-.19,-.02,.15,.32):
            box('Protective grip rib',meter,(x,y,.10),(.10,.069,.30),RUBBER,.019)
    box('LCD surround',meter,(0,.422,.325),(.997,.467,.073),DARK,.048)
    box('Recessed LCD',meter,(0,.416,.373),(.888,.347,.026),LCD,.032)
    empty('Display_Meter',(0,.416,.391),parent=meter)
    label('CAPABLE   RMS',meter,(-.47,.682,.324),.088,DARK)
    label('DIGITAL MULTIMETER',meter,(-.46,-.581,.322),.063,IVORY)
    knob = empty('MeterSelector',(0,-.128,.335),parent=meter)
    lathe('Rotary selector',knob,(0,0,0),[(0,.255),(.037,.245),(.090,.224),(.11,.211)],DARK,sides=32)
    box('Raised selector handle',knob,(0,0,.106),(.10,.35,.076),RUBBER,.024)
    box('Pointer index',knob,(0,.108,.146),(.045,.083,.011),IVORY,.007)
    empty('Hit_MeterSelector',(0,0,.164),parent=knob)
    label('V~',meter,(-.427,.080,.330),.096,IVORY)
    label('OHM',meter,(.285,.080,.330),.096,IVORY)
    for key,x,tint in [('Black',-.28,BLACK),('Red',.28,RED)]:
        lathe('Input socket',meter,(x,-.69,.327),[(0,.102),(.023,.102),(.039,.079)],DARK,sides=18)
        lathe('Molded lead plug',meter,(x,-.69,.358),[(0,.076),(.11,.077),(.17,.048)],tint,sides=16)
        empty('Socket_'+key,(x,-.69,.515),parent=meter)
    for key,x,tint in [('Red',2.10,RED),('Black',1.66,BLACK)]:
        probe = empty('Probe'+key,parent=root)
        lathe('Insulated probe handle',probe,(0,0,0),[(0,.014),(.13,.018),(.16,.041),(.25,.055),(.44,.056),(.58,.046),(.63,.034)],tint,sides=18)
        lathe('Stainless probe tip',probe,(0,0,0),[(0,.009),(.046,.014),(.135,.015)],STEEL,sides=14)
        for offset in (.32,.37,.42,.47):
            lathe('Molded finger grip',probe,(0,0,offset),[(0,.058),(.018,.059),(.027,.055)],RUBBER,sides=16)
        empty('Tip_'+key,parent=probe)
        empty('LeadEnd_'+key,(0,0,.63),parent=probe)
        empty('Park_'+key,(x,-1.754,1.93),parent=root)
    shadow('Meter stand contact',tabletop,(3.20,-1.798,1.61),2.3,1.65,True)
    return root, points, door


def make_environment():
    yy, xx = np.indices((256, 512), dtype=np.float32)
    env = np.ones((256,512,3), dtype=np.float32) * np.array((.13,.151,.17), dtype=np.float32)
    env += (.21 * (yy / 255) ** 1.6)[:, :, None]
    for x,y,w,h,intensity,tint in [(185,163,32,28,.83,(1,.94,.80)),(400,155,60,32,.56,(.74,.87,1)),(81,187,23,35,.61,(.92,.97,1))]:
        glow = np.exp(-((xx-x)/w)**4-((yy-y)/h)**4) * intensity
        env += glow[:, :, None] * tint
    tex = image('Workshop reflection environment', env)
    tex.filepath_raw = str(ASSET/'studio.png')
    tex.file_format = 'PNG'
    tex.save()


def camera_preview(door):
    def aim(obj, target):
        obj.rotation_euler = (Vector(xyz(target))-obj.location).to_track_quat('-Z','Y').to_euler()

    def area(name, p, target, power, size, tint):
        light = bpy.data.lights.new(name,'AREA')
        light.energy = power
        light.shape = 'DISK'
        light.size = size
        light.color = tint
        obj = bpy.data.objects.new(name,light)
        bpy.context.collection.objects.link(obj)
        obj.location = xyz(p)
        aim(obj,target)

    scene = bpy.context.scene
    camera = bpy.data.cameras.new('Workbench preview')
    obj = bpy.data.objects.new('Workbench preview',camera)
    bpy.context.collection.objects.link(obj)
    obj.location = xyz((4.5,3.25,15.5))
    aim(obj,(0,-.68,.50))
    camera.type = 'ORTHO'
    camera.ortho_scale = 12.9
    scene.camera = obj
    area('Broad key',(-3,6,7),(-1,0,0),3200,6,(1,.92,.78))
    area('Soft fill',(5,3,5),(1,0,0),1200,5,(.76,.88,1))
    area('Bench edge',(1,6,-2),(0,-1,0),1900,4,(.91,.97,1))
    scene.world = bpy.data.worlds.new('Industrial workshop world')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.25,.29,.32,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .32
    door.rotation_euler.z = -1.88
    for key, x in [('Red',2.10),('Black',1.66)]:
        probe = bpy.data.objects['Probe'+key]
        probe.location = xyz((x,-1.754,1.93))
        meter_x = 3.48 if key == 'Red' else 2.92
        cable('Parked preview lead '+key,bpy.data.objects['CAPABLE_Workbench'],[(meter_x,-1.67,2.155),(meter_x,-1.748,2.435),
            (meter_x-.16,-1.748,2.68),(x+.23,-1.748,2.72),(x,-1.754,2.56)],RED if key == 'Red' else BLACK,.024)
    scene.view_settings.view_transform = 'AgX'
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 20
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 880
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    PREVIEW.parent.mkdir(parents=True,exist_ok=True)
    scene.render.filepath = str(PREVIEW)
    bpy.ops.render.render(write_still=True)


def manifest(points, model):
    with model.open('rb') as file:
        file.read(12)
        size, kind = struct.unpack('<II',file.read(8))
        assert kind == 0x4e4f534a
        doc = json.loads(file.read(size))
    names = {item.get('name') for item in doc['nodes']}
    stats = {'bytes':model.stat().st_size,'triangles':sum(doc['accessors'][p['indices']]['count']//3
             for g in doc['meshes'] for p in g['primitives']), 'textures':len(doc.get('images',[]))}
    values = {
        'schema':1,'root':'CAPABLE_Workbench','calibrationMetersPerUnit':.16,
        'terminals':{key:items[0] for key,items in points.items()},
        'faults':{'fuse':'Fault_Fuse','neutral':'Fault_Neutral','switch':'Fault_Switch','lamp':'Fault_Lamp'},
        'controls':{'cover':'Hit_Cover','breakerExternal':'Hit_BreakerExterior','breakerInternal':'Hit_BreakerInterior','switch':'Fault_Switch','mode':'Hit_MeterSelector'},
        'nodes':{'door':'CabinetDoor','exteriorLever':'ExteriorBreakerLever','interiorLever':'BreakerLever','wallRocker':'WallSwitchRocker',
                 'lamp':'LampDiffuser','lampHolder':'LampHolder','meter':'Multimeter','selector':'MeterSelector','display':'Display_Meter',
                 'breaker':'MCB','terminals':'TerminalBlocks','cables':'WiringAssembly','fuse':'FuseAssembly','neutral':'NeutralJoint','switch':'MainSwitch'},
        'probes':{key.lower():{'handle':'Probe'+key,'tip':'Tip_'+key,'end':'LeadEnd_'+key,'park':'Park_'+key,'socket':'Socket_'+key} for key in ('Red','Black')},
        'cameras':CAMERAS, 'stats': stats,
    }
    required = [values['root'],*(values['nodes'].values()),*(values['controls'].values()),*(values['terminals'].values()),
                *(values['faults'].values()),*(p['anchor'] for p in values['cameras'].values()),
                *(n for group in values['probes'].values() for n in group.values())]
    missing = set(required)-names
    if missing:
        raise ValueError(f'Missing glTF anchors: {sorted(missing)}')
    print(json.dumps(stats), flush=True)
    (ASSET/'manifest.json').write_text(json.dumps(values,indent=2)+'\n',encoding='utf-8')


def main():
    args = argparse.ArgumentParser()
    args.add_argument('--preview', action='store_true')
    options = args.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    global FONT, WORKTOP, GALV, CONTACT, FRAME, CABINET, COVER, INNER, DARK, RUBBER, STEEL, BRASS, IVORY, PLASTIC
    global RED, BLACK, BLUE, GREEN, YELLOW, WARNING, FLOOR, WALL, DUCT, GLASS, METER, LCD
    FONT = bpy.data.fonts.get('Bfont Regular')
    sys_font = Path('C:/Windows/Fonts/bahnschrift.ttf')
    if sys_font.is_file():
        FONT = bpy.data.fonts.load(str(sys_font))
    WORKTOP = material('Textured phenolic laminate','5d5549',.75,texture=grain('Phenolic 1024',1024,'655c50',13))
    GALV = material('Brushed galvanized backplate','74848b',.49,.37,grain('Galvanized 1024',1024,'809095',219,True))
    CONTACT = contact_material()
    FRAME = material('Charcoal powdercoat','343f43',.61,.24)
    CABINET = material('Pebble powdercoat','a8ada7',.59,.19)
    COVER = material('Cabinet powdercoat','c4c5b8',.56,.08)
    INNER = material('Anodized inset','687779',.54,.40)
    DARK = material('Dark marking and recess','1a2024',.73)
    RUBBER = material('Rubber protective mold','272e2e',.82)
    STEEL = material('Brushed hardware','b0b8b5',.39,.71)
    BRASS = material('Turned brass','b19757',.39,.65)
    IVORY = material('Ceramic and printed ivory','dedbd0',.54,.015)
    PLASTIC = material('Molded glass nylon','eff0e5',.48,.035)
    RED = material('Brick red PVC','b34535',.48,0,coat=.13)
    BLACK = material('Black PVC','272c32',.50,0,coat=.11)
    BLUE = material('Blue neutral PVC','315f80',.51,0,coat=.14)
    GREEN = material('Green earth PVC','356c57',.53)
    YELLOW = material('Earth tracer','c2ac49',.55)
    WARNING = material('Amber hazard print','ebbb57',.63)
    FLOOR = material('Workshop concrete','656a69',.81)
    WALL = material('Workshop steel wall','454f53',.76)
    DUCT = material('Cable duct polymer','7a8688',.66)
    GLASS = material('Frosted lamp glass','eee8d6',.32,.03,coat=.31)
    METER = material('Ochre meter overmold','c59240',.59,.015)
    LCD = material('Polarized LCD glass','a8b196',.36,.08,coat=.32)
    root, points, door = equipment()
    for view in CAMERAS.values():
        empty(view['anchor'],view['position'],parent=root)
    batch_geometry()
    model = ASSET/'practical-arena.glb'
    bpy.ops.export_scene.gltf(filepath=str(model), export_format='GLB', export_animations=False, export_extras=True,
                             export_yup=True, export_apply=True, export_materials='EXPORT')
    make_environment()
    manifest(points,model)
    if options.preview:
        camera_preview(door)


if __name__ == '__main__':
    main()
