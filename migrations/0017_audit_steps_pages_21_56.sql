-- Correct workbook positions and side-to-move markers audited against printed pages 21-56.
UPDATE puzzles
SET definition_json = json_set(definition_json, '$.fen', CASE id
  WHEN 'page-21-puzzle-01' THEN '8/4kpp1/5n2/3b3p/8/5P2/1B4P1/3R2K1 w - - 0 1'
  WHEN 'page-21-puzzle-07' THEN '3rR3/5pkp/5bp1/1p1n4/8/1B3N2/2P2PP1/6K1 w - - 0 1'
  WHEN 'page-21-puzzle-08' THEN '8/3b1pk1/1p4p1/2n5/B7/3N4/2P2PP1/6K1 w - - 0 1'
  WHEN 'page-21-puzzle-10' THEN '1k3r2/1p5p/2p2bp1/8/1P4N1/1Bn1RP2/2P3P1/7K w - - 0 1'
  WHEN 'page-22-puzzle-07' THEN '2r2b1k/pp3p1p/5pn1/1P6/P7/3N3P/2B2PP1/2R3K1 b - - 0 1'
  WHEN 'page-22-puzzle-10' THEN 'r4r1k/pp4pp/2bN4/3p1BP1/P7/1P3N2/6PP/R5K1 b - - 0 1'
  WHEN 'page-23-puzzle-02' THEN 'r2qk2r/1p2bp1p/p1bpp1n1/8/4P3/1BQ1BP2/PPP1N2P/2KR2R1 w - - 0 1'
  WHEN 'page-23-puzzle-04' THEN 'r4rk1/5ppp/pq2p3/2b5/3N4/PQ2PPP1/6KP/R2R4 b - - 0 1'
  WHEN 'page-23-puzzle-07' THEN '3rbnk1/p1N2n1p/1p2p1p1/3p2q1/3P4/1N1B1Q1P/PP4P1/5RK1 w - - 0 1'
  WHEN 'page-23-puzzle-10' THEN 'r1b1k1r1/1p1n1p1p/p3pn2/2q5/P3N3/4Q3/1PP2PPP/2B1KB1R b - - 0 1'
  WHEN 'page-23-puzzle-12' THEN '1q3r1k/6p1/p2pRr1p/1p3n2/8/1BPQ4/1P4PP/5RK1 w - - 0 1'
  WHEN 'page-24-puzzle-02' THEN 'r7/5pp1/p4np1/1pqk4/3p4/P5P1/2Q1RP2/2B3K1 w - - 0 1'
  WHEN 'page-24-puzzle-04' THEN '3nr3/p2bkp2/1p5p/5Pp1/8/1B3N1P/PP4P1/3R2K1 w - - 0 1'
  WHEN 'page-24-puzzle-05' THEN '7k/pp1r3r/2p1p3/b3PpB1/2P4R/1P6/P5P1/2K2R2 b - - 0 1'
  WHEN 'page-24-puzzle-06' THEN '8/pp1kb1pp/5n2/3p4/1N6/1PB5/P1PK2PP/8 b - - 0 1'
  WHEN 'page-24-puzzle-08' THEN '5r2/3n2p1/2p3k1/pp2n1N1/6Pp/2P1B2P/PP3R2/1K6 b - - 0 1'
  WHEN 'page-24-puzzle-10' THEN '1n1rr2k/pp4pp/5b2/8/1PQ1B3/P5P1/2P1N1KP/8 b - - 0 1'
  WHEN 'page-24-puzzle-12' THEN '3b4/p1r2kpp/1p2q1p1/3p4/1P6/P4N1P/1Q4PK/2R5 w - - 0 1'
  WHEN 'page-26-puzzle-01' THEN 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w - - 0 1'
  WHEN 'page-26-puzzle-09' THEN 'r1bqkb1r/pp1p1ppp/n1p2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1'
  WHEN 'page-26-puzzle-11' THEN 'rnb1k1nr/pppp1ppp/8/2b1p3/6Pq/7P/PPPPPPB1/RNBQK1NR w KQkq - 0 1'
  WHEN 'page-27-puzzle-01' THEN 'r4r1k/pp4pp/2bN4/3p1BP1/P7/1P3N2/6PP/R5K1 b - - 0 1'
  WHEN 'page-27-puzzle-07' THEN '6k1/6pb/1p3p2/8/4r3/2P2K2/1P3P2/7R w - - 0 1'
  WHEN 'page-27-puzzle-10' THEN '8/p7/1p4pk/2b4p/7P/P5r1/1P2Q1P1/7K w - - 0 1'
  WHEN 'page-27-puzzle-11' THEN 'r3k2r/pp1Q1ppp/4bn2/2p1p3/4P3/2NB4/PPP2PPP/3QK2R w - - 0 1'
  WHEN 'page-28-puzzle-01' THEN 'r3k2r/2p2ppp/2n1p3/p7/1p2P3/8/PPP2PPP/2KR1B1R w - - 0 1'
  WHEN 'page-28-puzzle-03' THEN '6k1/ppr2ppp/2p3b1/3pq3/8/2N2P2/PPPQ2PP/5RK1 w - - 0 1'
  WHEN 'page-28-puzzle-05' THEN '1q2r1k1/p4p2/5np1/1P6/P3p3/3r2NP/2Q2PP1/2R2RK1 w - - 0 1'
  WHEN 'page-28-puzzle-07' THEN '8/kp1nQ3/p1p3pr/5q2/1P6/P7/5PB1/2R3K1 w - - 0 1'
  WHEN 'page-28-puzzle-09' THEN '3r4/p2q1ppk/4pb1p/2p5/2P5/PNP3PP/1P2RP2/4QK2 b - - 0 1'
  WHEN 'page-28-puzzle-10' THEN '3r1qk1/2p2ppp/1p3n2/1Pn1Q3/8/5BP1/1PPNRPKP/r3R3 b - - 0 1'
  WHEN 'page-28-puzzle-11' THEN '5r2/pr4kp/2n3p1/1p6/1P5P/P3B3/6P1/4RRK1 w - - 0 1'
  WHEN 'page-28-puzzle-12' THEN '2rn4/pp1q2kp/4p1p1/8/8/5NQP/PP4PK/2R5 w - - 0 1'
  WHEN 'page-29-puzzle-01' THEN '6k1/4qppp/p1r5/1p2R3/5P1b/3B4/P1P1Q1P1/K7 b - - 0 1'
  WHEN 'page-29-puzzle-03' THEN 'rn3rk1/pp3ppp/1qpQ1n2/4N3/4P1b1/2P3P1/PP3PBP/R1B1K2R b KQ - 0 1'
  WHEN 'page-29-puzzle-05' THEN '5b2/p4p1p/1p2knp1/3Q4/3QpP2/1P2P3/P5KP/3R4 w - - 0 1'
  WHEN 'page-29-puzzle-07' THEN 'r5k1/ppp2ppp/1b1p2q1/8/PQ2P3/1P1P1NP1/2P2P1P/R5K1 b - - 0 1'
  WHEN 'page-29-puzzle-08' THEN '1k1r4/1pp2rpp/p1n5/2b5/P1P5/2N3P1/1P2QPK1/5R2 w - - 0 1'
  WHEN 'page-29-puzzle-10' THEN 'r2q1rk1/pp2ppnp/2n1b1p1/2pN4/2B5/1P2PN1P/P4PP1/R2Q1RK1 b - - 0 1'
  WHEN 'page-29-puzzle-11' THEN '5qk1/1p1r1pp1/p1b1p1p1/P7/3p4/QB1P1P2/1PP2KP1/7R w - - 0 1'
  WHEN 'page-30-puzzle-02' THEN '5rk1/6pp/4q3/1PQpb3/2p5/6P1/6BP/7K w - - 0 1'
  WHEN 'page-30-puzzle-04' THEN '3Q1qk1/b5p1/p1p4p/1p6/1P6/P6P/2B2PP1/6K1 w - - 0 1'
  WHEN 'page-30-puzzle-06' THEN 'rnbqkb1r/p3pppp/1p6/2p5/4n2B/2P2N2/PP2PPPP/RN1QKB1R w KQkq - 0 1'
  WHEN 'page-30-puzzle-08' THEN '2r3k1/p3Q1pp/8/2q1P3/1p6/6PP/1P4K1/3R4 w - - 0 1'
  WHEN 'page-30-puzzle-10' THEN '6k1/5pbp/2p3p1/3p4/3P4/1P2q1P1/P1R1B2P/4K2R b - - 0 1'
  WHEN 'page-32-puzzle-09' THEN '5rk1/1p3pp1/4n3/2pN1p2/2Pb1P2/1P3N2/2K3R1/8 w - - 0 1'
  WHEN 'page-33-puzzle-06' THEN '4k2r/1pp2p2/1pn3p1/4pqB1/7P/3Q4/P4PP1/3R2K1 w - - 0 1'
  WHEN 'page-33-puzzle-07' THEN '6nk/p4q1p/3p1P2/2p1p1QN/8/2PP4/P6P/6K1 w - - 0 1'
  WHEN 'page-33-puzzle-12' THEN '4nr1k/pp1q1p1p/3bpp2/5P2/1P1Q4/P3P3/1B3P1P/4K1R1 w - - 0 1'
  WHEN 'page-34-puzzle-05' THEN '3qr1k1/2R3pp/8/8/8/5QPP/5PK1/8 w - - 0 1'
  WHEN 'page-34-puzzle-07' THEN 'r2qrk2/pp1b2pQ/2n1p3/3pP1N1/3P4/2P5/P4PPP/R3R1K1 w - - 0 1'
  WHEN 'page-34-puzzle-11' THEN '5rk1/p3bppp/1p5q/2p5/2P2n2/1QB3P1/PP2N2P/4R2K b - - 0 1'
  WHEN 'page-35-puzzle-04' THEN '4r1k1/1p1R1pp1/p6p/2p2Q2/8/qP1P4/P5PP/1K6 b - - 0 1'
  WHEN 'page-35-puzzle-05' THEN '1k6/1p4pp/p2N4/2Q5/2Pn1q2/P6P/1P3PKP/5R2 b - - 0 1'
  WHEN 'page-35-puzzle-06' THEN 'r4k2/5p2/p2pppb1/3q4/2R4Q/1P2P1P1/PB5P/6K1 w - - 0 1'
  WHEN 'page-35-puzzle-07' THEN '1n6/pbk1r1pp/8/1p2Np2/5P2/P1B5/1P4PP/3R2K1 w - - 0 1'
  WHEN 'page-35-puzzle-09' THEN '8/6k1/1B4p1/P1ppb3/6PQ/1P1P3P/2PK4/5Q2 b - - 0 1'
  WHEN 'page-37-puzzle-02' THEN '4rk2/ppq3pp/1np5/2Np4/3P4/2Q5/PPP3PP/4R1K1 w - - 0 1'
  WHEN 'page-37-puzzle-03' THEN 'r2r2k1/1q2ppbp/p5p1/1p1Pn2n/1Q2P2P/3BBP2/P3N1P1/2R1K2R b - - 0 1'
  WHEN 'page-37-puzzle-08' THEN '5rk1/ppp3b1/3p4/1q2nbQ1/8/6P1/PP1R1PBP/5R1K b - - 0 1'
  WHEN 'page-37-puzzle-10' THEN '3r1r1k/pp2Rp1p/5nbQ/8/3q4/2R3PP/PP4BK/5N2 b - - 0 1'
  WHEN 'page-38-puzzle-06' THEN '2k5/8/8/K7/8/8/8/3R4 w - - 0 1'
  WHEN 'page-39-puzzle-05' THEN '1r6/p5k1/4Bpp1/7p/8/P1B1K3/5PPP/8 b - - 0 1'
  WHEN 'page-39-puzzle-10' THEN '4b3/1R6/3p2pk/2p1p2p/7P/1P4P1/2rr1P2/R4BK1 w - - 0 1'
  WHEN 'page-39-puzzle-12' THEN '2r3k1/5ppp/1Qp1pq2/1p6/1P2PP1n/P5N1/6PP/2R3K1 b - - 0 1'
  WHEN 'page-40-puzzle-03' THEN '6k1/5p2/1q4p1/2n1P3/3p4/8/K2N1QPP/8 b - - 0 1'
  WHEN 'page-40-puzzle-06' THEN '2r5/krp3b1/4R2p/p1N3p1/1p4P1/5N1P/PP3PK1/8 w - - 0 1'
  WHEN 'page-40-puzzle-07' THEN 'r7/6pk/4Rp2/1pP2Pp1/1P2pbP1/2P4K/2B4P/8 b - - 0 1'
  WHEN 'page-40-puzzle-09' THEN '5rk1/5pp1/p6p/1pr2b2/8/2P3PP/1P3RBK/4R3 w - - 0 1'
  WHEN 'page-40-puzzle-12' THEN '1r4k1/2q2p2/p5pp/nppr1b1N/5P1P/P3q3/1PP5/2K1RBR1 w - - 0 1'
  WHEN 'page-41-puzzle-03' THEN '5rk1/ppb3pp/4p3/8/4R3/5NP1/1Pn1BP1P/6K1 w - - 0 1'
  WHEN 'page-41-puzzle-06' THEN 'r3r1k1/p3bp2/2p3bp/6p1/8/P3B1P1/1P3PBP/2R2RK1 w - - 0 1'
  WHEN 'page-41-puzzle-08' THEN '3r1rk1/p3bppp/4p3/np6/8/5NBP/PP3PP1/2R1R1K1 w - - 0 1'
  WHEN 'page-41-puzzle-09' THEN 'r5k1/1p2qpbp/2n1p1p1/p1PpP3/5P2/1QN1B3/PP4PP/2R3K1 b - - 0 1'
  WHEN 'page-41-puzzle-11' THEN '2rq1rk1/pp3ppp/1n1np3/8/2P5/P3BN1P/1P2QPP1/R4RK1 w - - 0 1'
  WHEN 'page-42-puzzle-01' THEN '2r2k2/pp2b1pp/8/5p2/1P2p2P/PN2PnP1/1B2KP2/3R4 b - - 0 1'
  WHEN 'page-42-puzzle-07' THEN '4r1k1/5pp1/pp5p/1bpnp3/3nN3/1P1B1PP1/P1P2BKP/3R4 w - - 0 1'
  WHEN 'page-42-puzzle-08' THEN 'kb4r1/p2n2p1/1p3p2/2p5/4P3/2B4P/PP2B1P1/5R1K w - - 0 1'
  WHEN 'page-43-puzzle-05' THEN 'q7/5ppk/1p5p/b2N1q2/4p3/P3P2P/2r2PP1/5RK1 w - - 0 1'
  WHEN 'page-43-puzzle-06' THEN '1rbn1rk1/1p4pp/p2qp3/6N1/8/PQR3P1/1P4BP/4R2K w - - 0 1'
  WHEN 'page-43-puzzle-07' THEN 'r1b2rk1/pp1nbppp/1qp1p3/6N1/2PPp3/1Q4P1/PP2PPBP/R1B1R1K1 b - - 0 1'
  WHEN 'page-43-puzzle-10' THEN '2r2b2/1br3pk/p6p/5N1R/1p3P2/4B3/PPq2P2/KR4Q1 b - - 0 1'
  WHEN 'page-43-puzzle-11' THEN 'r7/5pBk/bp2p2p/p7/6Q1/1P6/2P2qPK/R7 w - - 0 1'
  WHEN 'page-43-puzzle-12' THEN '7k/Qpq3bn/2p4p/8/7N/4P2P/2RB1KP1/1r6 w - - 0 1'
  WHEN 'page-45-puzzle-01' THEN '3q4/8/7k/8/3N4/8/8/3R2K1 w - - 0 1'
  WHEN 'page-45-puzzle-03' THEN '5k2/8/r7/6p1/2R5/3B2P1/6K1/8 w - - 0 1'
  WHEN 'page-45-puzzle-04' THEN '7r/kqp5/pp6/4N3/3Q4/6P1/5P2/3R2K1 w - - 0 1'
  WHEN 'page-45-puzzle-05' THEN '8/6pk/7p/8/5Nq1/5nP1/5PK1/3Q4 b - - 0 1'
  WHEN 'page-45-puzzle-06' THEN 'k5Q1/p4R2/1p1r4/8/8/1Q3P2/8/5K2 w - - 0 1'
  WHEN 'page-45-puzzle-09' THEN '8/5k2/5p2/2r5/6Pn/5P2/5K2/3R2B1 w - - 0 1'
  WHEN 'page-45-puzzle-10' THEN '2r5/p5p1/5p2/B1k2P2/8/6P1/2B2K2/8 b - - 0 1'
  WHEN 'page-45-puzzle-11' THEN '6k1/p4p2/2Rbr1p1/8/P3p3/8/5PP1/5NK1 b - - 0 1'
  WHEN 'page-46-puzzle-01' THEN '8/1r6/1B6/4k3/8/8/4K3/1R6 b - - 0 1'
  WHEN 'page-46-puzzle-02' THEN '8/p7/6rp/2k5/6N1/3P3P/2B3P1/7K w - - 0 1'
  WHEN 'page-46-puzzle-03' THEN '6k1/1ppq1pp1/p2b3p/4r3/5Q2/P1N2P2/1PP2P1P/5RK1 b - - 0 1'
  WHEN 'page-46-puzzle-04' THEN 'r1b1kbnr/pp3ppp/4p3/3pP3/3q4/3B4/PP3PPP/RNBQK2R w - - 0 1'
  WHEN 'page-46-puzzle-07' THEN '6k1/1p3p2/r2pq1p1/8/4N3/6P1/5PB1/2R1R1K1 w - - 0 1'
  WHEN 'page-46-puzzle-09' THEN '6k1/5ppp/1p3b2/2p5/r3B3/2P3P1/1P3P2/4R1K1 w - - 0 1'
  WHEN 'page-46-puzzle-11' THEN '3r4/p5bk/1p1n3p/5p2/8/1P1QP1pP/P5P1/6NK b - - 0 1'
  WHEN 'page-46-puzzle-12' THEN 'r3r1k1/2nq1ppp/p1p1p3/8/R2B4/4P3/1PP1QPPP/5RK1 b - - 0 1'
  WHEN 'page-47-puzzle-01' THEN '3r2k1/p4pp1/1p3n2/2b5/3pP3/P4PB1/1PK1B2P/6R1 b - - 0 1'
  WHEN 'page-47-puzzle-03' THEN '7k/6p1/1pr5/p7/P3R3/1b3BP1/5P1K/8 w - - 0 1'
  WHEN 'page-47-puzzle-04' THEN 'r4rk1/1p3pbp/pn1pQ3/6P1/3P4/1PN1BQ1R/1P5P/R6K w - - 0 1'
  WHEN 'page-47-puzzle-05' THEN '5r2/2rnbppk/p2p3p/1p1qp3/4N3/P1P1BQ1P/1P3PP1/4R1K1 w - - 0 1'
  WHEN 'page-47-puzzle-06' THEN '1kr4r/p1p2pp1/2p2qp1/4R3/8/PN1Q4/1BP2PPP/6K1 w - - 0 1'
  WHEN 'page-47-puzzle-07' THEN '5rk1/p1p2ppp/1p4Q1/3P2n1/2N5/2Q2P2/PP2r1PP/R4R1K b - - 0 1'
  WHEN 'page-47-puzzle-08' THEN 'r1bqr1k1/p1p2ppp/3b1n2/2P3B1/8/2NQ1N2/PP3PPP/R4RK1 b - - 0 1'
  WHEN 'page-47-puzzle-10' THEN '2k4r/pppq1bpp/4r3/2p1p3/4P3/PQ1P2P1/1PP3P1/2KR1B1R b - - 0 1'
  WHEN 'page-47-puzzle-11' THEN 'r3r1k1/p4ppp/1pp3b1/8/R3N1q1/3P4/1PPQ1PPP/4R1K1 w - - 0 1'
  WHEN 'page-47-puzzle-12' THEN '3q2k1/pp3ppp/3b4/3p1b2/3Br3/PNP4P/1PQ2PP1/R5K1 b - - 0 1'
  WHEN 'page-48-puzzle-01' THEN '6bk/p6p/4p3/1q2p3/1B6/2P4P/5PPK/1Q6 w - - 0 1'
  WHEN 'page-48-puzzle-02' THEN '2r1q1k1/1p3p2/p3p1p1/2b5/8/5N2/PPQ2PPP/4R1K1 b - - 0 1'
  WHEN 'page-48-puzzle-03' THEN '5rk1/pB1q1pp1/4p2p/8/b2n4/P2Q1P2/1Pr2RPP/1R2B1K1 b - - 0 1'
  WHEN 'page-48-puzzle-07' THEN '5rk1/3q1pp1/1p3b1p/8/3PR3/3Q2P1/2B2P2/6K1 w - - 0 1'
  WHEN 'page-48-puzzle-08' THEN '6k1/pp3ppp/4pn2/8/P7/2N1P2P/1r3PP1/2R3K1 w - - 0 1'
  WHEN 'page-48-puzzle-10' THEN '8/1pq3p1/kp4bp/8/2P2R2/1P4BP/6P1/7K w - - 0 1'
  WHEN 'page-48-puzzle-12' THEN '1r6/ppp1rnk1/3p1pp1/3P4/1PP1BP2/2Q3Pq/P7/4RRK1 w - - 0 1'
  WHEN 'page-50-puzzle-01' THEN '2R5/4p2k/6r1/pB6/P2pP2p/3Pb3/7P/7K w - - 0 1'
  WHEN 'page-50-puzzle-02' THEN '8/p5pk/1b4p1/1Q6/2P1q3/6Pp/5P1P/5RK1 w - - 0 1'
  WHEN 'page-50-puzzle-04' THEN 'rQ5k/6pp/2p2q2/2B2p2/3Pb3/7P/5PP1/1R4K1 b - - 0 1'
  WHEN 'page-50-puzzle-05' THEN 'kn1r1b2/1p5p/pQ6/P4p2/3B1q2/5P1K/P5P1/1R6 b - - 0 1'
  WHEN 'page-50-puzzle-08' THEN '4r1k1/2q2p1p/p4QpB/1pp5/3n4/8/PP4PP/5R1K b - - 0 1'
  WHEN 'page-50-puzzle-09' THEN '4r1k1/1b1n1p1p/pnq3pQ/1p4N1/1B6/P7/5PPP/R4BK1 b - - 0 1'
  WHEN 'page-50-puzzle-11' THEN '2k5/1p5r/2n5/1pB5/1P2Ppp1/R4n2/5P1P/5R1K w - - 0 1'
  WHEN 'page-51-puzzle-01' THEN '7k/2R5/1p3N1p/8/3n4/5P1K/r5P1/8 b - - 0 1'
  WHEN 'page-51-puzzle-04' THEN 'k7/1p3rp1/1Q4bp/8/5qP1/5B2/6P1/6BK b - - 0 1'
  WHEN 'page-51-puzzle-07' THEN '5K2/4Pb2/5k2/4n3/8/8/8/8 w - - 0 1'
  WHEN 'page-51-puzzle-08' THEN 'r3n1rk/p5pn/qpp5/4N2Q/8/1B5P/PB3PPK/8 b - - 0 1'
  WHEN 'page-51-puzzle-11' THEN '8/p7/P4P2/1kp5/8/1PK1R2R/1r1r4/8 w - - 0 1'
  WHEN 'page-51-puzzle-12' THEN '8/kpp2Q2/1p4P1/4p2P/4n3/1Pq4B/P1P5/1KbR4 w - - 0 1'
  WHEN 'page-53-puzzle-04' THEN '8/6k1/1B4p1/P1ppb3/6PQ/1P1P3P/2PK4/5Q2 b - - 0 1'
  WHEN 'page-53-puzzle-06' THEN 'r5r1/1kp5/2p3p1/1pn2p1p/5n2/1N3P2/PP3RPP/1K1BR3 b - - 0 1'
  WHEN 'page-53-puzzle-07' THEN '2k5/2p3p1/1p2p3/p7/3nP3/3PN1B1/1nPK3P/8 w - - 0 1'
  WHEN 'page-53-puzzle-08' THEN 'r4rk1/1p3pbp/pn1pq3/6P1/3P4/1PN1BQ1R/1P5P/R6K w - - 0 1'
  WHEN 'page-53-puzzle-10' THEN '2rr2k1/pp2qp2/2b1p1p1/8/1P6/P4N2/2Q2PPP/R3R1K1 b - - 0 1'
  WHEN 'page-54-puzzle-01' THEN 'rn1q1r2/pbp1p1kp/3p2p1/4bpN1/2P5/6P1/PP2PP1P/RNQ2RK1 w - - 0 1'
  WHEN 'page-54-puzzle-02' THEN '8/5P1k/4q3/8/8/5N2/5KP1/2b5 w - - 0 1'
  WHEN 'page-54-puzzle-05' THEN '8/2p1k2q/2Bp1p2/4p3/2P5/5PP1/3Q1PK1/1r3N2 w - - 0 1'
  WHEN 'page-54-puzzle-06' THEN '1k6/pp6/2p3p1/3p2p1/q2P4/P1Pp4/3K1PPP/R2R4 b - - 0 1'
  WHEN 'page-54-puzzle-07' THEN '3rk2r/pR3ppp/2p1p3/4b3/1B6/P5P1/5PKP/3R4 w - - 0 1'
  WHEN 'page-54-puzzle-08' THEN '7k/2p1Q1pp/P7/P1p3R1/3q4/5PK1/8/7r b - - 0 1'
  WHEN 'page-54-puzzle-09' THEN '3n2k1/5pp1/5b1p/7P/6P1/qB2QPP1/P7/1K6 w - - 0 1'
  WHEN 'page-54-puzzle-10' THEN '4q1k1/1p3p2/6p1/2p1n2p/p4N1P/1PP2P2/P5P1/4Q1K1 b - - 0 1'
  WHEN 'page-54-puzzle-11' THEN '5r1k/2b3pp/1p6/2p2n2/8/1Q1P4/1PP3NP/7K w - - 0 1'
  WHEN 'page-55-puzzle-02' THEN '3r2k1/1b1r1pp1/4p1qp/p1n1P3/1pP5/1P3N2/PB3RPP/2R2Q1K b - - 0 1'
  WHEN 'page-55-puzzle-05' THEN 'r3k2r/1ppq1p1p/p1npp1p1/8/2PP1P2/P1BQP3/1P4PP/R4RK1 w - - 0 1'
  WHEN 'page-55-puzzle-08' THEN '5r2/2p2knp/N2p2p1/5b2/PP3P2/8/7P/4R1BK b - - 0 1'
  WHEN 'page-55-puzzle-09' THEN '4rr1k/p4pb1/5R1p/1p2q3/3p4/3P2R1/PP1Q2BP/7K w - - 0 1'
  WHEN 'page-55-puzzle-10' THEN 'r5k1/pp2pp1p/6p1/4P3/5P2/1P4P1/P2QnqNP/2R4K b - - 0 1'
  WHEN 'page-55-puzzle-11' THEN '5r1k/6p1/1b1n4/8/7p/1PQ4P/P5PN/7K b - - 0 1'
  WHEN 'page-56-puzzle-05' THEN '5rk1/5ppp/2qb4/R1p5/2P5/7P/1rB1QPP1/5RK1 w - - 0 1'
  WHEN 'page-56-puzzle-07' THEN '2r3k1/6pp/p1p1Np2/1p6/1Pb1R1P1/P3K2P/1P3P2/8 b - - 0 1'
  WHEN 'page-56-puzzle-10' THEN '1k5r/p4pq1/1ppPp3/4R3/4K3/2P1N3/PP1Q3P/8 b - - 0 1'
  WHEN 'page-56-puzzle-12' THEN 'r3k2r/ppp3pp/4q3/4n3/3Q4/8/PPP2PPP/R1B1R1K1 b - - 0 1'
  END)
WHERE id IN (
  'page-21-puzzle-01',
  'page-21-puzzle-07',
  'page-21-puzzle-08',
  'page-21-puzzle-10',
  'page-22-puzzle-07',
  'page-22-puzzle-10',
  'page-23-puzzle-02',
  'page-23-puzzle-04',
  'page-23-puzzle-07',
  'page-23-puzzle-10',
  'page-23-puzzle-12',
  'page-24-puzzle-02',
  'page-24-puzzle-04',
  'page-24-puzzle-05',
  'page-24-puzzle-06',
  'page-24-puzzle-08',
  'page-24-puzzle-10',
  'page-24-puzzle-12',
  'page-26-puzzle-01',
  'page-26-puzzle-09',
  'page-26-puzzle-11',
  'page-27-puzzle-01',
  'page-27-puzzle-07',
  'page-27-puzzle-10',
  'page-27-puzzle-11',
  'page-28-puzzle-01',
  'page-28-puzzle-03',
  'page-28-puzzle-05',
  'page-28-puzzle-07',
  'page-28-puzzle-09',
  'page-28-puzzle-10',
  'page-28-puzzle-11',
  'page-28-puzzle-12',
  'page-29-puzzle-01',
  'page-29-puzzle-03',
  'page-29-puzzle-05',
  'page-29-puzzle-07',
  'page-29-puzzle-08',
  'page-29-puzzle-10',
  'page-29-puzzle-11',
  'page-30-puzzle-02',
  'page-30-puzzle-04',
  'page-30-puzzle-06',
  'page-30-puzzle-08',
  'page-30-puzzle-10',
  'page-32-puzzle-09',
  'page-33-puzzle-06',
  'page-33-puzzle-07',
  'page-33-puzzle-12',
  'page-34-puzzle-05',
  'page-34-puzzle-07',
  'page-34-puzzle-11',
  'page-35-puzzle-04',
  'page-35-puzzle-05',
  'page-35-puzzle-06',
  'page-35-puzzle-07',
  'page-35-puzzle-09',
  'page-37-puzzle-02',
  'page-37-puzzle-03',
  'page-37-puzzle-08',
  'page-37-puzzle-10',
  'page-38-puzzle-06',
  'page-39-puzzle-05',
  'page-39-puzzle-10',
  'page-39-puzzle-12',
  'page-40-puzzle-03',
  'page-40-puzzle-06',
  'page-40-puzzle-07',
  'page-40-puzzle-09',
  'page-40-puzzle-12',
  'page-41-puzzle-03',
  'page-41-puzzle-06',
  'page-41-puzzle-08',
  'page-41-puzzle-09',
  'page-41-puzzle-11',
  'page-42-puzzle-01',
  'page-42-puzzle-07',
  'page-42-puzzle-08',
  'page-43-puzzle-05',
  'page-43-puzzle-06',
  'page-43-puzzle-07',
  'page-43-puzzle-10',
  'page-43-puzzle-11',
  'page-43-puzzle-12',
  'page-45-puzzle-01',
  'page-45-puzzle-03',
  'page-45-puzzle-04',
  'page-45-puzzle-05',
  'page-45-puzzle-06',
  'page-45-puzzle-09',
  'page-45-puzzle-10',
  'page-45-puzzle-11',
  'page-46-puzzle-01',
  'page-46-puzzle-02',
  'page-46-puzzle-03',
  'page-46-puzzle-04',
  'page-46-puzzle-07',
  'page-46-puzzle-09',
  'page-46-puzzle-11',
  'page-46-puzzle-12',
  'page-47-puzzle-01',
  'page-47-puzzle-03',
  'page-47-puzzle-04',
  'page-47-puzzle-05',
  'page-47-puzzle-06',
  'page-47-puzzle-07',
  'page-47-puzzle-08',
  'page-47-puzzle-10',
  'page-47-puzzle-11',
  'page-47-puzzle-12',
  'page-48-puzzle-01',
  'page-48-puzzle-02',
  'page-48-puzzle-03',
  'page-48-puzzle-07',
  'page-48-puzzle-08',
  'page-48-puzzle-10',
  'page-48-puzzle-12',
  'page-50-puzzle-01',
  'page-50-puzzle-02',
  'page-50-puzzle-04',
  'page-50-puzzle-05',
  'page-50-puzzle-08',
  'page-50-puzzle-09',
  'page-50-puzzle-11',
  'page-51-puzzle-01',
  'page-51-puzzle-04',
  'page-51-puzzle-07',
  'page-51-puzzle-08',
  'page-51-puzzle-11',
  'page-51-puzzle-12',
  'page-53-puzzle-04',
  'page-53-puzzle-06',
  'page-53-puzzle-07',
  'page-53-puzzle-08',
  'page-53-puzzle-10',
  'page-54-puzzle-01',
  'page-54-puzzle-02',
  'page-54-puzzle-05',
  'page-54-puzzle-06',
  'page-54-puzzle-07',
  'page-54-puzzle-08',
  'page-54-puzzle-09',
  'page-54-puzzle-10',
  'page-54-puzzle-11',
  'page-55-puzzle-02',
  'page-55-puzzle-05',
  'page-55-puzzle-08',
  'page-55-puzzle-09',
  'page-55-puzzle-10',
  'page-55-puzzle-11',
  'page-56-puzzle-05',
  'page-56-puzzle-07',
  'page-56-puzzle-10',
  'page-56-puzzle-12'
);
-- COUNT 154

-- Restore the workbook's intended solutions where the original catalog had
-- answers from a different diagram or a later ply in the combination.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.answers', json_array('Nf6+'),
  '$.answerMoves', json_array('h5f6'),
  '$.sideToMove', 'white'
)
WHERE id = 'page-40-puzzle-12';

-- This diagram has no black-to-move marker.  The White bishop on b6 makes
-- the workbook answer Bd4+, uncovering the rook's attack along the b-file.
UPDATE puzzles
SET definition_json = json_set(
  definition_json,
  '$.answerMoves', json_array('b6d4'),
  '$.sideToMove', 'white',
  '$.fen', '8/1r6/1B6/4k3/8/8/4K3/1R6 w - - 0 1'
)
WHERE id = 'page-46-puzzle-01';

UPDATE puzzles
SET definition_json = json_set(definition_json, '$.answers',
  CASE id
    WHEN 'page-50-puzzle-01' THEN json_array('h3')
    WHEN 'page-50-puzzle-02' THEN json_array('Qd5')
    WHEN 'page-50-puzzle-03' THEN json_array('fxg4')
    WHEN 'page-50-puzzle-04' THEN json_array('Qd8')
    WHEN 'page-50-puzzle-05' THEN json_array('Qh6+')
    WHEN 'page-50-puzzle-06' THEN json_array('Rd4')
    WHEN 'page-50-puzzle-07' THEN json_array('Re1')
    WHEN 'page-50-puzzle-08' THEN json_array('Ne6')
    WHEN 'page-50-puzzle-09' THEN json_array('Nf6')
    WHEN 'page-50-puzzle-10' THEN json_array('Kg1')
    WHEN 'page-50-puzzle-11' THEN json_array('Rxf3')
  END
)
WHERE id BETWEEN 'page-50-puzzle-01' AND 'page-50-puzzle-11';

UPDATE puzzles
SET definition_json = json_set(definition_json, '$.answers',
  CASE id
    WHEN 'page-51-puzzle-01' THEN json_array('No')
    WHEN 'page-51-puzzle-02' THEN json_array('Qxb7')
    WHEN 'page-51-puzzle-03' THEN json_array('Rd1+')
    WHEN 'page-51-puzzle-04' THEN json_array('No')
    WHEN 'page-51-puzzle-05' THEN json_array('No')
    WHEN 'page-51-puzzle-06' THEN json_array('Qxb3')
    WHEN 'page-51-puzzle-07' THEN json_array('e8=N+')
    WHEN 'page-51-puzzle-08' THEN json_array('No')
    WHEN 'page-51-puzzle-09' THEN json_array('Nh3')
    WHEN 'page-51-puzzle-10' THEN json_array('Kb1')
    WHEN 'page-51-puzzle-11' THEN json_array('No')
    WHEN 'page-51-puzzle-12' THEN json_array('No')
  END
)
WHERE id BETWEEN 'page-51-puzzle-01' AND 'page-51-puzzle-12';

UPDATE puzzles
SET definition_json = json_set(definition_json, '$.answers',
  CASE id
    WHEN 'page-53-puzzle-04' THEN json_array('Bf4+')
    WHEN 'page-53-puzzle-06' THEN json_array('Ncd3')
    WHEN 'page-53-puzzle-07' THEN json_array('Kc3')
    WHEN 'page-54-puzzle-01' THEN json_array('Ne6+')
    WHEN 'page-54-puzzle-05' THEN json_array('Be4')
    WHEN 'page-54-puzzle-06' THEN json_array('Qc2+')
    WHEN 'page-54-puzzle-07' THEN json_array('Re7+')
    WHEN 'page-54-puzzle-08' THEN json_array('Qh4+')
    WHEN 'page-54-puzzle-10' THEN json_array('Nxf3+')
    WHEN 'page-55-puzzle-02' THEN json_array('Nd3')
    WHEN 'page-55-puzzle-08' THEN json_array('Bc8')
    WHEN 'page-55-puzzle-09' THEN json_array('Qxh6+')
    WHEN 'page-55-puzzle-10' THEN json_array('Nxg3+')
    WHEN 'page-55-puzzle-11' THEN json_array('Ne4')
    WHEN 'page-56-puzzle-07' THEN json_array('Bd5')
    WHEN 'page-56-puzzle-10' THEN json_array('Rh4+')
    WHEN 'page-56-puzzle-12' THEN json_array('Nf3+')
  END
)
WHERE id IN (
  'page-53-puzzle-04', 'page-53-puzzle-06', 'page-53-puzzle-07',
  'page-54-puzzle-01', 'page-54-puzzle-05', 'page-54-puzzle-06',
  'page-54-puzzle-07', 'page-54-puzzle-08', 'page-54-puzzle-10',
  'page-55-puzzle-02', 'page-55-puzzle-08', 'page-55-puzzle-09',
  'page-55-puzzle-10', 'page-55-puzzle-11', 'page-56-puzzle-07',
  'page-56-puzzle-10', 'page-56-puzzle-12'
);
