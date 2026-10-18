# 2D Rigged Character Asset & Animation Technical Specification
**Project:** Tambaram Medical Center — AI Patient Feedback Portal  
**Character:** Friendly Female Doctor / Healthcare Assistant  
**Document Version:** 1.0.0  

---

## 1. Executive Summary

This document defines the formal asset and animation rigging specification for the **Tambaram Medical Center 2D Doctor Assistant**. It establishes the exact production standards for 2D animators, technical artists, and rigging engineers working with vector/raster artwork, **HTML5 Canvas**, **Rive (`.riv`)**, **Esoteric Spine (`.skel`/`.atlas`)**, or **Live2D Cubism (`.moc3`)**.

---

## 2. Character Visual Design Standards

- **Role:** Professional, empathetic, warm female healthcare assistant.
- **Attire:**
  - **Outer:** Crisp white doctor's lab coat with sharp lapels, breast pocket with pens, and an official hospital ID badge ("Tambaram Medical Center").
  - **Inner:** Medical teal-blue scrubs with clean V-neck collar.
  - **Accessory:** Dark slate binaural stethoscope draped naturally around the neck with a metallic diaphragm chest-piece.
- **Hair & Features:**
  - Dark glossy hair neatly tied back with a teal medical hairband.
  - Swept bangs across the forehead with soft specular highlights.
  - Expressive brown eyes with distinct sclera, pupils, and dual specular highlights.
  - Soft, friendly blush on the cheeks.
  - Articulated mouth supporting distinct phonetic visemes and warm smiles.

---

## 3. Photoshop / Illustrator Layer Breakdown

For external 2D animators preparing source PSD/AI files for skeletal rigging, every anatomical part must be isolated on an independent, non-flattened layer with at least **15px of overlap margin** beneath joints to prevent seam separation during extreme bone rotations.

| Layer Name | Type | Description | Pivot Point $(x, y)$ |
| :--- | :--- | :--- | :--- |
| `hair_back` | Raster/Vector | Low bun and rear volume behind head | Neck Base $(0, 0)$ |
| `hair_band` | Raster/Vector | Teal blue hair tie securing rear hair | Center $(0, 0)$ |
| `body_torso_scrub` | Raster/Vector | Blue scrub chest shirt base | Torso Center $(0, 0)$ |
| `body_coat_left` | Raster/Vector | Left coat lapel & pocket | Left Shoulder Joint |
| `body_coat_right` | Raster/Vector | Right coat lapel & hospital ID badge | Right Shoulder Joint |
| `steth_neck_tubes` | Raster/Vector | Binaural stethoscope tubes crossing neck | Neck Midline |
| `steth_chest_piece` | Raster/Vector | Dangling PVC tube & metallic bell | Y-connector pivot |
| `arm_left_upper` | Raster/Vector | Left upper sleeve | Left Shoulder $(x=-36, y=-48)$ |
| `arm_left_forearm` | Raster/Vector | Left forearm & scrub cuff | Left Elbow $(x=0, y=38)$ |
| `hand_left_*` | Spritesheet | Left hand states: `rest`, `clasp`, `open`, `namaste` | Left Wrist $(x=0, y=36)$ |
| `arm_right_upper` | Raster/Vector | Right upper sleeve | Right Shoulder $(x=36, y=-48)$ |
| `arm_right_forearm` | Raster/Vector | Right forearm & scrub cuff | Right Elbow $(x=0, y=38)$ |
| `hand_right_*` | Spritesheet | Right hand states: `wave`, `point`, `thumbs_up`, `open`, `clasp`, `namaste` | Right Wrist $(x=0, y=36)$ |
| `neck` | Raster/Vector | Neck cylinder with chin shadow tone | Base of Neck |
| `head_base` | Raster/Vector | Jawline, ears, chin, and blush | Chin / Jaw Pivot $(0, -16)$ |
| `eye_left_sclera` | Raster/Vector | Left eyeball background white | Left Eye Center $(x=-13, y=-20)$ |
| `eye_left_iris` | Raster/Vector | Left brown iris, pupil, highlights | Look-at tracking offset |
| `eye_left_lid` | Parametric | Skin tone eyelid closure | Eyelid Top $(0, -10)$ |
| `brow_left` | Path / Vector | Left eyebrow curve with emotion tilt | Left Brow Base |
| `eye_right_sclera` | Raster/Vector | Right eyeball background white | Right Eye Center $(x=13, y=-20)$ |
| `eye_right_iris` | Raster/Vector | Right brown iris, pupil, highlights | Look-at tracking offset |
| `eye_right_lid` | Parametric | Skin tone eyelid closure | Eyelid Top $(0, -10)$ |
| `brow_right` | Path / Vector | Right eyebrow curve with emotion tilt | Right Brow Base |
| `nose` | Vector Path | Minimalist clean curve | Center Nose |
| `mouth_rig` | Vector Morpher | Phonetic visemes: `rest`, `smile`, `wide_smile`, `talk_a`, `talk_o`, `talk_e`, `think`, `empathy` | Mouth Center $(0, -2)$ |
| `hair_front_bangs` | Raster/Vector | Swept bangs & front locks with spring sway | Top Forehead |

---

## 4. Skeletal Hierarchy & Kinematic Tree

```
root (0, 0)
└── bone_pelvis
    └── bone_torso
        ├── bone_left_clavicle
        │   └── bone_left_upper_arm
        │       └── bone_left_forearm
        │           └── bone_left_hand (Sprite slot: rest | clasp | open | namaste)
        ├── bone_right_clavicle
        │   └── bone_right_upper_arm
        │       └── bone_right_forearm
        │           └── bone_right_hand (Sprite slot: wave | point | thumbs_up | open | clasp | namaste)
        ├── bone_stethoscope_hang (Angular spring-damper physics)
        │   └── bone_stethoscope_bell
        └── bone_neck
            └── bone_head
                ├── bone_left_eye (Gaze vector constraint: target_x, target_y)
                │   └── bone_left_eyelid (Scalar blink: 0.0 - 1.0)
                ├── bone_right_eye (Gaze vector constraint: target_x, target_y)
                │   └── bone_right_eyelid (Scalar blink: 0.0 - 1.0)
                ├── bone_left_eyebrow (Parametric angle & elevation)
                ├── bone_right_eyebrow (Parametric angle & elevation)
                ├── bone_mouth (Viseme shape morpher)
                └── bone_hair_front (Secondary inertia sway physics)
```

---

## 5. Rive State Machine Specification (for Rive `.riv` export)

If exporting to **Rive Studio (`.riv`)**, configure the State Machine named `"FeedbackAssistant"` with the following inputs:

| Input Name | Type | Allowed Values | Target Effect |
| :--- | :--- | :--- | :--- |
| `StateNumber` | Number (Enum) | `0`: Welcome<br>`1`: Point Name<br>`2`: Gesture Phone<br>`3`: Present Rating<br>`4`: Listening<br>`5`: Thinking<br>`6`: Review Preview<br>`7`: Namaste<br>`8`: Goodbye Wave | Transitions root body and arm poses |
| `RatingScore` | Number | `1` to `5` | `1-2`: Empathetic frown & clasp<br>`3`: Attentive nod<br>`4-5`: Joyful smile & thumbs up |
| `IsSpeaking` | Boolean | `true` / `false` | Enables real-time mouth viseme phoneme cycle |
| `GazeTargetX` | Number | `-1.0` to `1.0` | Horizontal pupil look-at tracking |
| `GazeTargetY` | Number | `-1.0` to `1.0` | Vertical pupil look-at tracking |
| `AudioLevel` | Number | `0.0` to `1.0` | Modulates listening nod amplitude during voice recording |
| `TriggerBlink` | Trigger | Fire event | Forces an immediate organic blink cycle |

---

## 6. Spine 2D Skin & Slot Architecture (for Spine `.skel` export)

- **Skins:** `default` (standard doctor coat & stethoscope).
- **Slots:**
  - `hand_r_slot`: Attachments: `hand_r_wave`, `hand_r_point`, `hand_r_thumbsup`, `hand_r_open`, `hand_r_namaste`.
  - `hand_l_slot`: Attachments: `hand_l_rest`, `hand_l_open`, `hand_l_clasp`, `hand_l_namaste`.
  - `mouth_slot`: Attachments: `mouth_smile`, `mouth_wide`, `mouth_a`, `mouth_o`, `mouth_e`, `mouth_think`, `mouth_empathy`.
  - `eye_l_lid_slot`: Alpha blend / mesh deforming eyelid slice.
  - `eye_r_lid_slot`: Alpha blend / mesh deforming eyelid slice.
- **IK Constraints:**
  - `ik_r_arm`: 2-bone IK solver for pointing at dynamic form coordinate targets.

---

## 7. Hot-Swap Adapter Interface

The current application includes an extensible runtime controller (`DoctorCharacterRigController` in `doctor-rig.js`). To swap between the built-in HTML5 Canvas procedural skeletal rig and an external Rive or Spine runtime, implement the adapter interface:

```javascript
class RiveDoctorRigAdapter {
  constructor(canvas, rivUrl) {
    this.rive = new rive.Rive({
      src: rivUrl,
      canvas: canvas,
      autoplay: true,
      stateMachines: 'FeedbackAssistant',
      onLoad: () => {
        const inputs = this.rive.stateMachineInputs('FeedbackAssistant');
        this.inputState = inputs.find(i => i.name === 'StateNumber');
        this.inputRating = inputs.find(i => i.name === 'RatingScore');
        this.inputSpeaking = inputs.find(i => i.name === 'IsSpeaking');
        this.inputGazeX = inputs.find(i => i.name === 'GazeTargetX');
        this.inputGazeY = inputs.find(i => i.name === 'GazeTargetY');
      }
    });
  }

  setPose(poseName) {
    const map = { welcome: 0, point_name: 1, gesture_phone: 2, rate_neutral: 3, listening: 4, thinking: 5, preview: 6, namaste: 7, goodbye: 8 };
    if (this.inputState) this.inputState.value = map[poseName] ?? 0;
  }

  setGaze(x, y) {
    if (this.inputGazeX) this.inputGazeX.value = x;
    if (this.inputGazeY) this.inputGazeY.value = y;
  }

  speak(seconds) {
    if (this.inputSpeaking) {
      this.inputSpeaking.value = true;
      setTimeout(() => { this.inputSpeaking.value = false; }, seconds * 1000);
    }
  }
}
```
