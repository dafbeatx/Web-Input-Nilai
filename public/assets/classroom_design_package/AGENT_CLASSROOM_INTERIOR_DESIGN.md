# Task for AI Agent: Build Classroom Interiors + Door Entry/Exit Interaction

## 1. Goal

Implement playable interiors for **Kelas VII, Kelas VIII, and Kelas IX** in the Phaser 3 school RPG. Use `classroom_design_reference.png` as the visual reference for the room layout and interaction UI.

The reference image is a **design board**, not a game background. Rebuild the room as actual Phaser objects / a Tilemap scene so the player can walk around desks, collide with walls, and use the door. Do not display the entire design board as a single image in the game.

## 2. Visual Direction

- Top-down orthogonal RPG perspective, consistent with the school map and existing character sprites.
- School palette: white and light blue walls, cool light-gray floor tiles, dark-blue trim, brown wooden furniture.
- Clean, readable pixel-art style with consistent outline thickness and shadows.
- The interior should look like a real Indonesian classroom and remain uncluttered enough for the player to move around.
- Keep all characters/NPCs out of the room by default. NPC placement can be added later.

## 3. Classroom Layout

Create one reusable classroom layout and instantiate it for Classes VII, VIII, and IX through configuration (room name, class label, optional wall decoration). Suggested logical room size: **20 columns × 14 rows**, with **32 × 32 px** tiles. The room may be scaled to fit the current game viewport, but keep tile dimensions consistent with the project.

### Required visual elements

1. **Walls and floor**
   - Light-gray tiled floor across the walkable area.
   - White walls with a light-blue lower wall band and blue trim.
   - Side windows on the left and right walls.
   - A single main door centered on the bottom wall, unless existing exterior door coordinates require a different position.

2. **Front teaching area**
   - Large green chalkboard / whiteboard centered on the top wall.
   - Teacher desk and chair near the front-left area.
   - Small computer or teaching materials on the teacher desk.

3. **Student seating**
   - Arrange desks in **3 columns** with **3–4 rows** (use the reference image as a guide).
   - Leave clear aisles between columns and a wider central aisle toward the door.
   - Each desk has a chair; desks and chairs must be separate collidable objects or a clearly defined collision footprint.

4. **Classroom details**
   - Clock on the wall.
   - School emblem / Garuda display and framed school-related pictures.
   - Class information board / notice board.
   - Bookshelf and potted plants near side walls or corners.
   - Do not place props over the walkable aisle or in front of the exit.

## 4. Door Entry Marker on the Exterior Map

At each exterior classroom entrance (Kelas VII, VIII, IX):

- Define a small interaction zone immediately in front of the actual door, not over the roof or whole building.
- Add a visible marker: a subtle green glowing floor tile / outlined pad plus a small downward arrow above the doorway.
- When the player is within interaction range, display a prompt such as:
  - `E  Masuk Kelas VII`
  - `E  Masuk Kelas VIII`
  - `E  Masuk Kelas IX`
- Hide the prompt when the player leaves the interaction range.
- Do not show the prompt permanently, and do not make the entire building trigger entry.
- The prompt must be above the player/UI-safe area and must not cover the door.

### Input support

- Desktop / PID: `E` key to interact.
- Touch devices: show a sufficiently large **Masuk** interaction button only while the player is near a classroom door.
- Avoid requiring a tiny tap target. Use a touch target of at least 48 × 48 CSS pixels.
- Keyboard and touch should call the same interaction handler to prevent duplicated logic.

## 5. Entering the Classroom

When the player presses `E` or taps **Masuk**:

1. Confirm the player is still inside the correct classroom interaction zone.
2. Store the exterior scene key, classroom ID, and the player's exterior position.
3. Play a short fade transition.
4. Start or open the matching interior, e.g. `ClassroomScene` with `classroomId: "VII"`.
5. Spawn the player just inside the bottom door, facing upward.
6. Keep the currently selected character and its animation state/texture key. Do not reset the Character Selector.

Use a single reusable scene and data-driven configuration where practical. Do not create three unrelated copies of the same scene.

## 6. Exiting the Classroom

Inside the room:

- Place an exit interaction zone directly inside the bottom door.
- Show `E  Keluar` when the player approaches it.
- On `E` or the mobile **Keluar** button, fade out and return to the saved exterior scene.
- Restore the player close to the same classroom door, just outside the building, with a small safe offset so the player does not immediately re-enter.
- Restore camera follow and input cleanly.
- Clear temporary interaction prompts and prevent double-triggering during transitions.

## 7. Collision and Depth

- Use Phaser Arcade Physics (or the project's existing physics system).
- Walls, door frames, teacher desk, student desks, chairs, bookshelf, and fixed props need collision footprints.
- Floor tiles are walkable.
- The door opening itself must not be blocked while entering/exiting.
- Do not apply collision to decorative wall art, floor markings, or the entire classroom image.
- Enable depth sorting for characters and objects using their ground/base Y coordinate (e.g. `setDepth(object.y)` or the project's established depth helper).
- The player must appear behind a desk when standing above it and in front of it when standing below it, without walking over furniture.

## 8. Suggested Data Contract

Keep classroom definitions centralized. Adapt naming to the current codebase rather than introducing duplicate systems.

```ts
export type ClassroomId = "VII" | "VIII" | "IX";

export interface ClassroomConfig {
  id: ClassroomId;
  title: string;
  exteriorDoor: { x: number; y: number };
  interiorSpawn: { x: number; y: number };
  interiorExit: { x: number; y: number; width: number; height: number };
  tilemapKey: string;
}
```

Example labels:
- `VII` → `Kelas VII`
- `VIII` → `Kelas VIII`
- `IX` → `Kelas IX`

Persist the return position in the scene transition payload or the project's existing game-state manager. Do not add a database round trip just to enter or leave a room.

## 9. Acceptance Checklist

- [ ] There are playable interiors for Kelas VII, VIII, and IX.
- [ ] The three rooms use the same visual language as the reference design.
- [ ] Each exterior classroom has a marker located at its door.
- [ ] The entry prompt appears only when the player is near that door.
- [ ] `E` works on desktop/PID.
- [ ] A large touch interaction button works on HP/PID touch mode.
- [ ] Entering opens the correct classroom.
- [ ] The selected character is retained after entering.
- [ ] The player can walk through aisles but cannot pass through walls or furniture.
- [ ] The exit prompt appears at the interior door.
- [ ] Exiting returns the player to the correct exterior door and restores camera follow.
- [ ] No duplicate triggers, stuck input, or immediate re-entry loop occurs.
- [ ] Test at desktop size and a narrow mobile/PID viewport.

## 10. Implementation Notes

Before editing, inspect the existing Phaser scenes, player controller, Character Selector, input manager, physics configuration, and map coordinate system. Reuse the project's existing conventions and avoid introducing a second movement or interaction system.

Keep this task scoped to classroom interiors and door transitions. Do not redesign the exterior campus map, replace the existing characters, or change unrelated HUD features.
