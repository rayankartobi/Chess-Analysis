// ---------------------------------------------------------------------
// OPENING BOOK — large database of common opening move sequences (SAN)
// Each entry is an array of moves in order. A position is "book" if
// the moves played so far exactly match a prefix of any line here.
// ---------------------------------------------------------------------
const OPENING_BOOK = [
  // ----- Open Games (1.e4 e5) -----
  [
    "e4",
    "e5",
    "Nf3",
    "Nc6",
    "Bb5",
    "a6",
    "Ba4",
    "Nf6",
    "O-O",
    "Be7",
    "Re1",
    "b5",
    "Bb3",
    "d6",
    "c3",
    "O-O",
  ], // Ruy Lopez Closed
  ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Bxc6", "dxc6", "O-O", "f6"], // Ruy Lopez Exchange
  [
    "e4",
    "e5",
    "Nf3",
    "Nc6",
    "Bb5",
    "Nf6",
    "O-O",
    "Nxe4",
    "d4",
    "Nd6",
    "Bxc6",
    "dxc6",
    "dxe5",
    "Nf5",
  ], // Berlin Defense
  ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d3"], // Italian Game
  [
    "e4",
    "e5",
    "Nf3",
    "Nc6",
    "Bc4",
    "Bc5",
    "b4",
    "Bxb4",
    "c3",
    "Ba5",
    "d4",
    "exd4",
  ], // Evans Gambit
  ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "d5", "exd5", "Na5"], // Two Knights Defense
  ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4", "Nf6", "Nc3", "Bb4"], // Scotch Game
  ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "c3", "dxc3", "Nxc3"], // Goring Gambit
  ["e4", "e5", "Nf3", "Nf6", "Nxe5", "d6", "Nf3", "Nxe4", "d4", "d5"], // Petrov's Defense
  ["e4", "e5", "Nc3", "Nf6", "f4", "d5", "fxe5", "Nxe4"], // Vienna Game
  ["e4", "e5", "f4", "exf4", "Nf3", "g5", "h4", "g4", "Ne5"], // King's Gambit Accepted, Kieseritzky
  ["e4", "e5", "f4", "Bc5", "Nf3", "d6"], // King's Gambit Declined
  ["e4", "e5", "Bc4", "Nf6", "d3", "Bc5"], // Bishop's Opening

  // ----- Sicilian Defense (1.e4 c5) -----
  ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"], // Najdorf
  ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6"], // Dragon
  ["e4", "c5", "Nf3", "Nc6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "e5"], // Sveshnikov
  ["e4", "c5", "Nf3", "e6", "d4", "cxd4", "Nxd4", "Nc6", "Nc3", "Qc7"], // Taimanov
  ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "e6"], // Scheveningen
  ["e4", "c5", "Nc3", "Nc6", "g3", "g6", "Bg2", "Bg7"], // Closed Sicilian
  ["e4", "c5", "c3", "Nf6", "e5", "Nd5", "d4", "cxd4", "Nf3"], // Alapin
  ["e4", "c5", "Nf3", "Nc6", "Bb5", "g6", "Bxc6", "dxc6"], // Rossolimo
  ["e4", "c5", "b4", "cxb4", "a3"], // Wing Gambit
  ["e4", "c5", "Nf3", "d6", "Bb5+", "Bd7"], // Moscow Variation
  ["e4", "c5", "d4", "cxd4", "c3", "dxc3", "Nxc3"], // Smith-Morra Gambit

  // ----- French Defense (1.e4 e6) -----
  ["e4", "e6", "d4", "d5", "Nc3", "Bb4"], // Winawer
  ["e4", "e6", "d4", "d5", "Nc3", "Nf6", "Bg5", "Be7"], // Classical French
  ["e4", "e6", "d4", "d5", "Nd2", "Nf6"], // Tarrasch
  ["e4", "e6", "d4", "d5", "exd5", "exd5"], // Exchange French
  ["e4", "e6", "d4", "d5", "e5", "c5"], // Advance French

  // ----- Caro-Kann Defense (1.e4 c6) -----
  ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5"], // Classical
  ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Nd7"], // Karpov Variation
  ["e4", "c6", "d4", "d5", "exd5", "cxd5", "Bd3"], // Exchange Caro-Kann
  ["e4", "c6", "d4", "d5", "Nd2", "dxe4", "Nxe4", "Bf5"], // Advance/Tartakower

  // ----- Pirc / Modern (1.e4 d6 / g6) -----
  ["e4", "d6", "d4", "Nf6", "Nc3", "g6", "f4", "Bg7"], // Austrian Attack Pirc
  ["e4", "d6", "d4", "Nf6", "Nc3", "g6", "Be2", "Bg7", "Nf3", "O-O"], // Classical Pirc
  ["e4", "g6", "d4", "Bg7", "Nc3", "d6"], // Modern Defense
  // ----- Modern Defense via 2.Nf3 (KID-style fianchetto, transposes from 1.e4) -----
  ["e4", "g6", "Nf3"], // Modern Defense, Nf3/Bc4 setup
  ["e4", "g6", "Nf3", "Bg7", "Nc3", "d6", "d4", "Nf6"], // Modern Defense -> Pirc transposition
  ["e4", "g6", "Nf3", "Bg7", "d4", "d6", "Nc3", "Nf6"], // alternate move order
  ["e4", "g6", "Nf3", "d6", "d4", "Bg7", "Nc3", "Nf6"], // Pirc-like move order

  // ----- Scandinavian (1.e4 d5) -----
  ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5"], // Scandinavian Main Line
  ["e4", "d5", "exd5", "Nf6", "d4", "Nxd5"], // Scandinavian Modern

  // ----- Alekhine Defense (1.e4 Nf6) -----
  ["e4", "Nf6", "e5", "Nd5", "d4", "d6", "Nf3", "g6"], // Alekhine Modern Variation
  ["e4", "Nf6", "e5", "Nd5", "c4", "Nb6", "d4", "d6"], // Alekhine Four Pawns Setup

  // ----- Queen's Pawn Openings (1.d4 d5) -----
  ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7"], // QGD Classical
  ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "cxd5", "exd5"], // QGD Exchange
  ["d4", "d5", "c4", "c6", "Nf3", "Nf6", "Nc3", "dxc4"], // Slav Accepted
  ["d4", "d5", "c4", "c6", "Nf3", "Nf6", "e3", "Bf5"], // Slav Defense
  ["d4", "d5", "c4", "dxc4", "Nf3", "Nf6", "e3", "e6"], // QGA
  ["d4", "d5", "Nf3", "Nf6", "c4", "e6", "Nc3", "Be7"], // QGD move order
  ["d4", "d5", "Bf4", "Nf6", "e3", "c5"], // London System
  ["d4", "d5", "Nf3", "Nf6", "Bg5", "Ne4", "Bf4"], // Trompowsky-ish
  ["d4", "d5", "c4", "e6", "Nf3", "Nf6", "g3"], // Catalan

  // ----- Indian Defenses (1.d4 Nf6) -----
  ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6"], // King's Indian Classical
  ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "f3", "O-O"], // King's Indian Samisch
  ["d4", "Nf6", "c4", "g6", "g3", "Bg7", "Bg2", "O-O"], // KIA / Fianchetto KID
  ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"], // Nimzo-Indian
  ["d4", "Nf6", "c4", "e6", "Nf3", "b6", "g3", "Bb7"], // Queen's Indian
  ["d4", "Nf6", "c4", "e6", "Nf3", "b6", "Bg5"], // QID with Bg5
  ["d4", "Nf6", "c4", "c5", "d5", "b5"], // Benko Gambit
  ["d4", "Nf6", "c4", "c5", "d5", "e6", "Nc3", "exd5"], // Modern Benoni
  ["d4", "Nf6", "Nf3", "g6", "c4", "Bg7", "Nc3", "O-O"], // Grunfeld-ish setup
  ["d4", "Nf6", "c4", "g6", "Nc3", "d5", "cxd5", "Nxd5"], // Grunfeld Main Line
  ["d4", "Nf6", "Bg5", "e6", "e4", "h6"], // Trompowsky
  ["d4", "Nf6", "Nf3", "e6", "g3", "d5", "Bg2", "Be7"], // Catalan move order
  ["d4", "Nf6", "c4", "e6", "Nc3", "d5", "cxd5", "exd5"], // QGD via Indian move order

  // ----- English Opening (1.c4) -----
  ["c4", "e5", "Nc3", "Nf6", "Nf3", "Nc6", "g3", "d5"], // English Reversed Sicilian
  ["c4", "c5", "Nf3", "Nf6", "Nc3", "d5"], // Symmetrical English
  ["c4", "Nf6", "Nc3", "e6", "Nf3", "d5", "d4"], // English to QGD
  ["c4", "g6", "Nc3", "Bg7", "g3", "c5"], // English Fianchetto

  // ----- Reti / Flank Openings -----
  ["Nf3", "d5", "g3", "Nf6", "Bg2", "e6", "O-O", "Be7"], // Reti Opening
  ["Nf3", "Nf6", "c4", "g6", "g3", "Bg7"], // King's Indian Attack setup
  ["Nf3", "d5", "c4", "c6", "b3"], // Reti, Slav-like
  ["g3", "d5", "Bg2", "Nf6", "Nf3", "c6"], // Hungarian / Benko Opening
  ["b3", "e5", "Bb2", "Nc6", "e3"], // Nimzo-Larsen Attack

  // ----- Other 1.e4 sidelines -----
  ["e4", "c6", "d4", "d5", "f3"], // Fantasy Variation Caro-Kann
  ["e4", "d6", "d4", "Nf6", "f3"], // Pirc, 150 Attack
  ["e4", "e5", "Nf3", "d6", "d4", "Bg4"], // Philidor Defense Hanham-ish
  ["e4", "e5", "Nf3", "d6", "Bc4", "Bg4", "Nc3", "g6"], // Philidor
  ["e4", "b6", "d4", "Bb7"], // Owen's Defense
  ["e4", "g6", "Nc3", "Bg7", "f4", "d6"], // Modern Defense Two Knights
  ["e4", "Nc6", "Nf3", "d5"], // Nimzowitsch Defense

  // ----- Other 1.d4 sidelines -----
  ["d4", "f5", "g3", "Nf6", "Bg2", "e6"], // Dutch Defense, Leningrad-ish
  ["d4", "f5", "c4", "Nf6", "Nc3", "e6", "Nf3", "Be7"], // Classical Dutch
  ["d4", "e6", "c4", "f5"], // Dutch via French move order
  ["d4", "d6", "Nf3", "Nf6", "c4", "g6"], // Old Indian/KID transposition
  ["d4", "g6", "c4", "Bg7", "Nc3", "d6"], // Modern via 1.d4
];

// Pre-tokenize for fast prefix matching: strip check/mate/annotation symbols
const NORMALIZED_OPENING_BOOK = OPENING_BOOK.map((line) =>
  line.map((m) => m.replace(/[+#!?]/g, "")),
);
