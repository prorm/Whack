import type { Lang } from './domain'

type L = { en: string; kn: string }

// Kannada copy is a first pass for the demo and should be reviewed by a native-speaking trainer.
export const S = {
  appName: { en: 'ScrollProof', kn: 'ScrollProof' },
  langToggle: { en: 'ಕನ್ನಡ', kn: 'English' },
  langToggleLabel: { en: 'Switch to Kannada', kn: 'Switch to English' },
  openWorkOrder: { en: 'Work order', kn: 'ವರ್ಕ್ ಆರ್ಡರ್' },
  passport: { en: 'Passport', kn: 'ಪಾಸ್‌ಪೋರ್ಟ್' },
  feed: { en: 'Feed', kn: 'ಫೀಡ್' },
  skip: { en: 'Skip', kn: 'ಮುಂದೆ' },
  back: { en: 'Back', kn: 'ಹಿಂದೆ' },
  captionsOn: { en: 'Captions on', kn: 'ಶೀರ್ಷಿಕೆ ಆನ್' },
  captionsOff: { en: 'Captions off', kn: 'ಶೀರ್ಷಿಕೆ ಆಫ್' },
  pause: { en: 'Pause', kn: 'ನಿಲ್ಲಿಸಿ' },
  play: { en: 'Play', kn: 'ಪ್ಲೇ' },
  replay: { en: 'Replay', kn: 'ಮತ್ತೆ ನೋಡಿ' },
  reelOf: { en: 'Reel {n} of {total}', kn: 'ರೀಲ್ {n} / {total}' },
  feedHint: { en: 'Swipe up, scroll, or use arrow keys', kn: 'ಮೇಲೆ ಸ್ವೈಪ್ ಮಾಡಿ ಅಥವಾ ಆರೋ ಕೀ ಬಳಸಿ' },
  noCredentialNote: { en: 'Watching and feed answers never earn a credential.', kn: 'ನೋಡುವುದರಿಂದ ಅಥವಾ ಫೀಡ್ ಉತ್ತರಗಳಿಂದ ಪ್ರಮಾಣಪತ್ರ ಸಿಗುವುದಿಲ್ಲ.' },

  // ---- hook reel
  hookTag: { en: 'Comedy hook', kn: 'ಹಾಸ್ಯ ಹುಕ್' },
  hookCap: [
    { en: 'Sheru Bhai walks in. The tap is dripping.', kn: 'ಶೇರು ಭಾಯ್ ಬರ್ತಾರೆ. ನಲ್ಲಿ ತೊಟ್ಟಿಕ್ಕುತ್ತಿದೆ.' },
    { en: 'He lowers his aviators: “Wrong washer, guru.”', kn: 'ಕನ್ನಡಕ ಇಳಿಸಿ: “ತಪ್ಪು ವಾಷರ್, ಗುರು.”' },
    { en: 'Every washer has 3 numbers, all in mm.', kn: 'ಪ್ರತಿ ವಾಷರ್‌ಗೆ 3 ಅಳತೆಗಳು, ಎಲ್ಲವೂ mm ನಲ್ಲಿ.' },
    { en: 'ID = inner diameter: across the hole.', kn: 'ID = ಒಳ ವ್ಯಾಸ: ರಂಧ್ರದ ಅಡ್ಡ ಅಳತೆ.' },
    { en: 'OD = outer diameter: across the whole washer.', kn: 'OD = ಹೊರ ವ್ಯಾಸ: ಇಡೀ ವಾಷರ್‌ನ ಅಡ್ಡ ಅಳತೆ.' },
    { en: 'Thickness: how tall it stands. Example: ID 15, OD 24, 3 mm thick.', kn: 'ದಪ್ಪ: ಎಷ್ಟು ಎತ್ತರ ನಿಲ್ಲುತ್ತದೆ. ಉದಾ: ID 15, OD 24, 3 mm ದಪ್ಪ.' },
    { en: 'One number off? Drip, drip, drip. Match all three.', kn: 'ಒಂದು ಅಳತೆ ತಪ್ಪಾದರೂ ಸೋರಿಕೆ. ಮೂರೂ ಹೊಂದಿಸಿ.' },
  ] as L[],
  hookStaticAlt: {
    en: 'Diagram: a washer with ID across the hole, OD across the outside edge, and thickness as its height.',
    kn: 'ಚಿತ್ರ: ರಂಧ್ರದ ಅಡ್ಡ ID, ಹೊರ ಅಂಚಿನ ಅಡ್ಡ OD, ಎತ್ತರ ದಪ್ಪ.',
  },
  labelID: { en: 'ID', kn: 'ID' },
  labelOD: { en: 'OD', kn: 'OD' },
  labelT: { en: 'thickness', kn: 'ದಪ್ಪ' },

  // ---- quiz reel
  quizTag: { en: 'Quick check · untimed', kn: 'ತ್ವರಿತ ಪರೀಕ್ಷೆ · ಸಮಯ ಮಿತಿ ಇಲ್ಲ' },
  quizQ: { en: 'A washer measures 24 mm across its outside edge. What is that number called?', kn: 'ಒಂದು ವಾಷರ್ ಹೊರ ಅಂಚಿನಿಂದ ಅಂಚಿಗೆ 24 mm ಇದೆ. ಆ ಅಳತೆಯ ಹೆಸರೇನು?' },
  quizOptID: { en: 'Inner diameter (ID)', kn: 'ಒಳ ವ್ಯಾಸ (ID)' },
  quizOptOD: { en: 'Outer diameter (OD)', kn: 'ಹೊರ ವ್ಯಾಸ (OD)' },
  quizOptT: { en: 'Thickness', kn: 'ದಪ್ಪ' },
  quizRight: { en: 'Correct. OD is measured across the outside edge. ID is the hole; thickness is the height.', kn: 'ಸರಿ. OD ಅನ್ನು ಹೊರ ಅಂಚಿನ ಅಡ್ಡ ಅಳೆಯುತ್ತಾರೆ. ID ರಂಧ್ರ; ದಪ್ಪ ಎತ್ತರ.' },
  quizWrongID: { en: 'Not quite. ID is only the hole in the middle. 24 mm across the outside edge is the OD.', kn: 'ಇನ್ನೂ ಸರಿಯಿಲ್ಲ. ID ಮಧ್ಯದ ರಂಧ್ರ ಮಾತ್ರ. ಹೊರ ಅಂಚಿನ 24 mm ಅಳತೆ OD.' },
  quizWrongT: { en: 'Not quite. Thickness is how tall the washer stands. 24 mm across the outside edge is the OD.', kn: 'ಇನ್ನೂ ಸರಿಯಿಲ್ಲ. ದಪ್ಪ ಅಂದರೆ ವಾಷರ್ ಎತ್ತರ. ಹೊರ ಅಂಚಿನ 24 mm ಅಳತೆ OD.' },
  quizSaved: { en: 'Saved for later: this skill will come back first next time you open the feed.', kn: 'ನಂತರಕ್ಕೆ ಉಳಿಸಲಾಗಿದೆ: ಮುಂದಿನ ಬಾರಿ ಫೀಡ್ ತೆರೆದಾಗ ಈ ಕೌಶಲ್ಯ ಮೊದಲು ಬರುತ್ತದೆ.' },
  tryAgain: { en: 'Try again', kn: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ' },
  nextReel: { en: 'Next reel', kn: 'ಮುಂದಿನ ರೀಲ್' },

  // ---- callback reel
  callbackTag: { en: 'Callback · new example', kn: 'ಮರುನೆನಪು · ಹೊಸ ಉದಾಹರಣೆ' },
  callbackPriority: { en: 'Back for you: you missed this last time.', kn: 'ನಿಮಗಾಗಿ ಮತ್ತೆ: ಕಳೆದ ಬಾರಿ ಇದು ತಪ್ಪಾಗಿತ್ತು.' },
  callbackCap: [
    { en: 'HUSS HUSS HUSS! The DRIP monster is chasing you!', kn: 'ಹುಸ್ ಹುಸ್ ಹುಸ್! DRIP ರಾಕ್ಷಸ ಹಿಂದೆ ಬರ್ತಿದೆ!' },
    { en: 'Garden hose needs: ID 19 mm, OD 27 mm, thickness 2 mm.', kn: 'ಗಾರ್ಡನ್ ಹೋಸ್‌ಗೆ ಬೇಕು: ID 19 mm, OD 27 mm, ದಪ್ಪ 2 mm.' },
    { en: 'The spare in your pocket says 19 / 27 / 3.', kn: 'ಜೇಬಿನಲ್ಲಿರುವ ಸ್ಪೇರ್: 19 / 27 / 3.' },
    { en: 'Escape move: check all three. ID ✓  OD ✓  thickness ✗', kn: 'ತಪ್ಪಿಸಿಕೊಳ್ಳುವ ದಾರಿ: ಮೂರೂ ಪರಿಶೀಲಿಸಿ. ID ✓  OD ✓  ದಪ್ಪ ✗' },
    { en: 'One wrong number = reject the part. The monster loses.', kn: 'ಒಂದು ಅಳತೆ ತಪ್ಪಾದರೂ ಭಾಗ ತಿರಸ್ಕರಿಸಿ. ರಾಕ್ಷಸ ಸೋಲುತ್ತದೆ.' },
  ] as L[],
  callbackStaticAlt: { en: 'Checklist: ID 19 matches, OD 27 matches, thickness 3 does not match 2, so reject.', kn: 'ಪಟ್ಟಿ: ID 19 ಸರಿ, OD 27 ಸರಿ, ದಪ್ಪ 3 ≠ 2, ಆದ್ದರಿಂದ ತಿರಸ್ಕರಿಸಿ.' },

  // ---- job reel
  jobTag: { en: 'Nearby job · demo listing', kn: 'ಹತ್ತಿರದ ಕೆಲಸ · ಡೆಮೊ ಪಟ್ಟಿ' },
  jobNeeds: { en: 'Required skill', kn: 'ಬೇಕಾದ ಕೌಶಲ್ಯ' },
  jobPay: { en: 'Sample pay', kn: 'ಮಾದರಿ ಸಂಬಳ' },
  jobShift: { en: 'Shift', kn: 'ಶಿಫ್ಟ್' },
  jobWhere: { en: 'Locality', kn: 'ಪ್ರದೇಶ' },
  jobCta: { en: 'Try the work order', kn: 'ವರ್ಕ್ ಆರ್ಡರ್ ಪ್ರಯತ್ನಿಸಿ' },
  jobFictional: { en: 'Fictional contractor for the demo. No real employer.', kn: 'ಡೆಮೊಗಾಗಿ ಕಾಲ್ಪನಿಕ ಗುತ್ತಿಗೆದಾರ. ನಿಜವಾದ ಉದ್ಯೋಗದಾತ ಅಲ್ಲ.' },

  // ---- work order
  woTitle: { en: 'Unseen work order', kn: 'ಹೊಸ ವರ್ಕ್ ಆರ್ಡರ್' },
  woJob: { en: 'Kitchen tap drips. Replace the washer with a part from the bin.', kn: 'ಅಡುಗೆಮನೆ ನಲ್ಲಿ ತೊಟ್ಟಿಕ್ಕುತ್ತಿದೆ. ಬಿನ್‌ನಿಂದ ಸರಿಯಾದ ವಾಷರ್ ಹಾಕಿ.' },
  woSpec: { en: 'Required washer', kn: 'ಬೇಕಾದ ವಾಷರ್' },
  woStep1: { en: '1. Pick one part from the bin', kn: '1. ಬಿನ್‌ನಿಂದ ಒಂದು ಭಾಗ ಆಯ್ಕೆಮಾಡಿ' },
  woStep2: { en: '2. Which checks did you make? Pick every check that matters.', kn: '2. ಯಾವ ಪರಿಶೀಲನೆಗಳು ಮುಖ್ಯ? ಎಲ್ಲವನ್ನೂ ಆಯ್ಕೆಮಾಡಿ.' },
  woPart: { en: 'Part', kn: 'ಭಾಗ' },
  woSubmit: { en: 'Submit work order', kn: 'ವರ್ಕ್ ಆರ್ಡರ್ ಸಲ್ಲಿಸಿ' },
  woNeedAll: { en: 'Pick a part and at least one check.', kn: 'ಒಂದು ಭಾಗ ಮತ್ತು ಕನಿಷ್ಠ ಒಂದು ಪರಿಶೀಲನೆ ಆಯ್ಕೆಮಾಡಿ.' },
  chk_id: { en: 'Inner diameter (ID)', kn: 'ಒಳ ವ್ಯಾಸ (ID)' },
  chk_od: { en: 'Outer diameter (OD)', kn: 'ಹೊರ ವ್ಯಾಸ (OD)' },
  chk_thickness: { en: 'Thickness', kn: 'ದಪ್ಪ' },
  chk_colour: { en: 'Colour', kn: 'ಬಣ್ಣ' },
  chk_brand: { en: 'Brand name', kn: 'ಬ್ರ್ಯಾಂಡ್ ಹೆಸರು' },
  chk_weight: { en: 'Weight', kn: 'ತೂಕ' },
  simPassed: { en: 'Simulation passed', kn: 'ಸಿಮ್ಯುಲೇಶನ್ ಉತ್ತೀರ್ಣ' },
  simPassedBody: {
    en: 'You picked the part that matches all three dimensions. This is not a credential yet: a trainer must review a real demonstration.',
    kn: 'ಮೂರೂ ಅಳತೆಗೆ ಹೊಂದುವ ಭಾಗ ಆಯ್ಕೆಮಾಡಿದ್ದೀರಿ. ಇದು ಇನ್ನೂ ಪ್ರಮಾಣಪತ್ರ ಅಲ್ಲ: ತರಬೇತುದಾರರು ನಿಜವಾದ ಪ್ರದರ್ಶನವನ್ನು ಪರಿಶೀಲಿಸಬೇಕು.',
  },
  addEvidence: { en: 'Add practical evidence', kn: 'ಪ್ರಾಯೋಗಿಕ ಪುರಾವೆ ಸೇರಿಸಿ' },

  // ---- practice
  practiceTitle: { en: 'Not yet: practice round', kn: 'ಇನ್ನೂ ಇಲ್ಲ: ಅಭ್ಯಾಸ ಸುತ್ತು' },
  practiceNoProof: { en: 'No proof is awarded for this attempt.', kn: 'ಈ ಪ್ರಯತ್ನಕ್ಕೆ ಯಾವುದೇ ಪುರಾವೆ ಸಿಗುವುದಿಲ್ಲ.' },
  pr_part: { en: 'The part you picked does not match: {dims}.', kn: 'ನೀವು ಆರಿಸಿದ ಭಾಗ ಹೊಂದುವುದಿಲ್ಲ: {dims}.' },
  pr_partOk: { en: 'Your part choice matched the work order.', kn: 'ನಿಮ್ಮ ಭಾಗದ ಆಯ್ಕೆ ಸರಿಯಾಗಿದೆ.' },
  pr_missing: { en: 'Checks you skipped: {list}.', kn: 'ಬಿಟ್ಟ ಪರಿಶೀಲನೆಗಳು: {list}.' },
  pr_extra: { en: 'These do not decide fit: {list}.', kn: 'ಇವು ಹೊಂದಾಣಿಕೆಯನ್ನು ನಿರ್ಧರಿಸುವುದಿಲ್ಲ: {list}.' },
  pr_rule: { en: 'Rule: compare ID, OD and thickness with the work order. All three must match.', kn: 'ನಿಯಮ: ID, OD ಮತ್ತು ದಪ್ಪವನ್ನು ವರ್ಕ್ ಆರ್ಡರ್ ಜೊತೆ ಹೋಲಿಸಿ. ಮೂರೂ ಹೊಂದಬೇಕು.' },
  pr_rewatch: { en: 'Rewatch the lesson', kn: 'ಪಾಠ ಮತ್ತೆ ನೋಡಿ' },
  pr_retry: { en: 'Try a fresh work order', kn: 'ಹೊಸ ವರ್ಕ್ ಆರ್ಡರ್ ಪ್ರಯತ್ನಿಸಿ' },
  dim_id: { en: 'ID', kn: 'ID' },
  dim_od: { en: 'OD', kn: 'OD' },
  dim_t: { en: 'thickness', kn: 'ದಪ್ಪ' },

  // ---- evidence
  evTitle: { en: 'Practical evidence', kn: 'ಪ್ರಾಯೋಗಿಕ ಪುರಾವೆ' },
  evBody: { en: 'Record a short video: measure ID, OD and thickness, then fit the matching washer. It stays on this device.', kn: 'ಚಿಕ್ಕ ವಿಡಿಯೋ ಮಾಡಿ: ID, OD, ದಪ್ಪ ಅಳೆದು ಸರಿಯಾದ ವಾಷರ್ ಹಾಕಿ. ಇದು ಈ ಸಾಧನದಲ್ಲೇ ಉಳಿಯುತ್ತದೆ.' },
  evPick: { en: 'Record or choose a video', kn: 'ವಿಡಿಯೋ ರೆಕಾರ್ಡ್ ಮಾಡಿ ಅಥವಾ ಆಯ್ಕೆಮಾಡಿ' },
  evFixture: { en: 'Use sample evidence (DEMO FIXTURE)', kn: 'ಮಾದರಿ ಪುರಾವೆ ಬಳಸಿ (ಡೆಮೊ ಫಿಕ್ಸ್ಚರ್)' },
  evFixtureNote: { en: 'Sample evidence is demo data, not your own work.', kn: 'ಮಾದರಿ ಪುರಾವೆ ಡೆಮೊ ಡೇಟಾ, ನಿಮ್ಮ ಕೆಲಸ ಅಲ್ಲ.' },
  evAttached: { en: 'Evidence attached to this attempt. Waiting for trainer review.', kn: 'ಈ ಪ್ರಯತ್ನಕ್ಕೆ ಪುರಾವೆ ಸೇರಿಸಲಾಗಿದೆ. ತರಬೇತುದಾರರ ಪರಿಶೀಲನೆಗೆ ಕಾಯುತ್ತಿದೆ.' },
  evReplace: { en: 'Replace evidence', kn: 'ಪುರಾವೆ ಬದಲಿಸಿ' },
  evReplaceNote: { en: 'Replacing evidence clears its review. The new evidence must be reviewed again.', kn: 'ಪುರಾವೆ ಬದಲಿಸಿದರೆ ಪರಿಶೀಲನೆ ಅಳಿಸುತ್ತದೆ. ಹೊಸ ಪುರಾವೆಯನ್ನು ಮತ್ತೆ ಪರಿಶೀಲಿಸಬೇಕು.' },
  evTooBig: { en: 'That video is over 60 MB. Record a shorter clip.', kn: 'ವಿಡಿಯೋ 60 MB ಗಿಂತ ದೊಡ್ಡದು. ಚಿಕ್ಕ ಕ್ಲಿಪ್ ಮಾಡಿ.' },
  evNeedsPass: { en: 'Pass the work-order simulation first.', kn: 'ಮೊದಲು ವರ್ಕ್ ಆರ್ಡರ್ ಸಿಮ್ಯುಲೇಶನ್ ಉತ್ತೀರ್ಣರಾಗಿ.' },
  openTrainer: { en: 'Open trainer demo view', kn: 'ತರಬೇತುದಾರರ ಡೆಮೊ ವೀಕ್ಷಣೆ ತೆರೆಯಿರಿ' },
  viewPassport: { en: 'View proof passport', kn: 'ಪುರಾವೆ ಪಾಸ್‌ಪೋರ್ಟ್ ನೋಡಿ' },

  // ---- passport
  ppTitle: { en: 'Proof passport', kn: 'ಪುರಾವೆ ಪಾಸ್‌ಪೋರ್ಟ್' },
  ppSkill: { en: 'Skill', kn: 'ಕೌಶಲ್ಯ' },
  ppSkillName: { en: 'Washer matching: ID, OD and thickness', kn: 'ವಾಷರ್ ಹೊಂದಿಸುವಿಕೆ: ID, OD ಮತ್ತು ದಪ್ಪ' },
  ppSim: { en: 'Simulation', kn: 'ಸಿಮ್ಯುಲೇಶನ್' },
  ppReview: { en: 'Trainer review', kn: 'ತರಬೇತುದಾರರ ಪರಿಶೀಲನೆ' },
  ppArtifact: { en: 'Artifact', kn: 'ಕಲಾಕೃತಿ / ಪುರಾವೆ' },
  ppChecklist: { en: 'Checklist outcome', kn: 'ಪರಿಶೀಲನಾ ಪಟ್ಟಿ ಫಲಿತಾಂಶ' },
  ppReviewer: { en: 'Reviewer', kn: 'ಪರಿಶೀಲಕರು' },
  ppReason: { en: 'Trainer note', kn: 'ತರಬೇತುದಾರರ ಟಿಪ್ಪಣಿ' },
  ppConsent: { en: 'Show my evidence video in the contractor preview', kn: 'ಗುತ್ತಿಗೆದಾರರ ಪೂರ್ವವೀಕ್ಷಣೆಯಲ್ಲಿ ನನ್ನ ಪುರಾವೆ ವಿಡಿಯೋ ತೋರಿಸಿ' },
  ppConsentNote: { en: 'Off by default. You can turn it off any time.', kn: 'ಮೂಲತಃ ಆಫ್. ಯಾವಾಗ ಬೇಕಾದರೂ ಆಫ್ ಮಾಡಬಹುದು.' },
  ppVerified: { en: 'Reviewed skill', kn: 'ಪರಿಶೀಲಿತ ಕೌಶಲ್ಯ' },
  ppNotYet: { en: 'Not a reviewed skill yet', kn: 'ಇನ್ನೂ ಪರಿಶೀಲಿತ ಕೌಶಲ್ಯ ಅಲ್ಲ' },
  openContractor: { en: 'Open contractor preview', kn: 'ಗುತ್ತಿಗೆದಾರರ ಪೂರ್ವವೀಕ್ಷಣೆ ತೆರೆಯಿರಿ' },
  st_not_started: { en: 'Not started', kn: 'ಆರಂಭಿಸಿಲ್ಲ' },
  st_failed: { en: 'Not passed: practice needed', kn: 'ಉತ್ತೀರ್ಣವಾಗಿಲ್ಲ: ಅಭ್ಯಾಸ ಬೇಕು' },
  st_passed: { en: 'Simulation passed', kn: 'ಸಿಮ್ಯುಲೇಶನ್ ಉತ್ತೀರ್ಣ' },
  st_no_evidence: { en: 'No evidence yet', kn: 'ಇನ್ನೂ ಪುರಾವೆ ಇಲ್ಲ' },
  st_awaiting_review: { en: 'Awaiting trainer review', kn: 'ತರಬೇತುದಾರರ ಪರಿಶೀಲನೆಗೆ ಕಾಯುತ್ತಿದೆ' },
  st_approved: { en: 'Approved by trainer', kn: 'ತರಬೇತುದಾರರಿಂದ ಅನುಮೋದಿತ' },
  st_needs_another_attempt: { en: 'Needs another attempt', kn: 'ಮತ್ತೊಂದು ಪ್ರಯತ್ನ ಬೇಕು' },
  ppRetry: { en: 'Start a new attempt', kn: 'ಹೊಸ ಪ್ರಯತ್ನ ಆರಂಭಿಸಿ' },

  // ---- offline / reset
  offlineReady: { en: 'Offline ready', kn: 'ಆಫ್‌ಲೈನ್ ಸಿದ್ಧ' },
  offlineCaching: { en: 'Saving for offline…', kn: 'ಆಫ್‌ಲೈನ್‌ಗೆ ಉಳಿಸಲಾಗುತ್ತಿದೆ…' },
  offlineNo: { en: 'Online only', kn: 'ಆನ್‌ಲೈನ್ ಮಾತ್ರ' },
  youAreOffline: { en: 'You are offline', kn: 'ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ' },
  reset: { en: 'Reset demo', kn: 'ಡೆಮೊ ಮರುಹೊಂದಿಸಿ' },
} satisfies Record<string, L | L[]>

export type Key = { [K in keyof typeof S]: (typeof S)[K] extends L ? K : never }[keyof typeof S]

export function tr(lang: Lang, key: Key, vars?: Record<string, string | number>) {
  let s = (S[key] as L)[lang]
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v))
  return s
}
