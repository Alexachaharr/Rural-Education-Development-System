import 'dotenv/config';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { existsSync, unlinkSync } from 'fs';
import bcrypt from 'bcryptjs';
import { getDb, closeDb, DB_PATH } from './db.js';

/**
 * Seeds demo data (schools, subjects, chapters, quizzes, scholarships, demo users).
 * Runs automatically on server start when the database is empty, so a fresh
 * clone (or a fresh deploy with an empty disk) always has data to show.
 *
 * Manual reset:  npm run seed   (deletes the DB file and seeds again)
 */
export function seedIfEmpty() {
  const db = getDb();
  const { c } = db.prepare('SELECT COUNT(*) as c FROM schools').get();
  if (c > 0) return false;
  seedDatabase(db);
  return true;
}

export function seedDatabase(db = getDb()) {
  console.log('🌱 Seeding database...');
  db.transaction(() => seedAll(db))();
  console.log('\n🎉 Database seeded successfully!\n');
  console.log('Demo accounts (password: password123):');
  console.log('  Student → student@demo.com');
  console.log('  Teacher → teacher@demo.com');
  console.log('  Parent  → parent@demo.com\n');
}

function seedAll(db) {

  // ─── SCHOOLS ─────────────────────────────────────────────────────────────────
  const schools = [
    // Maharashtra
    ['Kendriya Vidyalaya No. 1', 'Mumbai', 'Mumbai City', 'Maharashtra', 'CBSE', '400001', 'MH001'],
    ['St. Xavier High School', 'Mumbai', 'Mumbai Suburban', 'Maharashtra', 'ICSE', '400050', 'MH002'],
    ['Pune International School', 'Pune', 'Pune', 'Maharashtra', 'CBSE', '411001', 'MH003'],
    ['Nashik Public School', 'Nashik', 'Nashik', 'Maharashtra', 'CBSE', '422001', 'MH004'],
    ['Nagpur Central School', 'Nagpur', 'Nagpur', 'Maharashtra', 'CBSE', '440001', 'MH005'],
    // Delhi
    ['Delhi Public School R.K. Puram', 'New Delhi', 'South West Delhi', 'Delhi', 'CBSE', '110022', 'DL001'],
    ['Modern School Barakhamba', 'New Delhi', 'Central Delhi', 'Delhi', 'CBSE', '110001', 'DL002'],
    ['Springdales School Pusa Road', 'New Delhi', 'West Delhi', 'Delhi', 'CBSE', '110005', 'DL003'],
    ['Air Force Bal Bharati School', 'New Delhi', 'South Delhi', 'Delhi', 'CBSE', '110010', 'DL004'],
    // Tamil Nadu
    ['P.S. Senior Secondary School', 'Chennai', 'Chennai', 'Tamil Nadu', 'CBSE', '600004', 'TN001'],
    ['DAV Boys Senior Secondary', 'Chennai', 'Chennai', 'Tamil Nadu', 'CBSE', '600086', 'TN002'],
    ['Vidya Mandir Senior Secondary', 'Chennai', 'Chennai', 'Tamil Nadu', 'CBSE', '600028', 'TN003'],
    ['Coimbatore Public School', 'Coimbatore', 'Coimbatore', 'Tamil Nadu', 'CBSE', '641001', 'TN004'],
    ['Madurai Kendriya Vidyalaya', 'Madurai', 'Madurai', 'Tamil Nadu', 'CBSE', '625001', 'TN005'],
    // Karnataka
    ['National Public School', 'Bengaluru', 'Bangalore Urban', 'Karnataka', 'CBSE', '560001', 'KA001'],
    ['The Frank Anthony Public School', 'Bengaluru', 'Bangalore Urban', 'Karnataka', 'ICSE', '560025', 'KA002'],
    ['Mysore Public School', 'Mysuru', 'Mysore', 'Karnataka', 'CBSE', '570001', 'KA003'],
    // Uttar Pradesh
    ['City Montessori School', 'Lucknow', 'Lucknow', 'Uttar Pradesh', 'ICSE', '226001', 'UP001'],
    ['Kendriya Vidyalaya IIT Kanpur', 'Kanpur', 'Kanpur Nagar', 'Uttar Pradesh', 'CBSE', '208016', 'UP002'],
    ['Agra Public School', 'Agra', 'Agra', 'Uttar Pradesh', 'CBSE', '282001', 'UP003'],
    // Rajasthan
    ['Maharaja Sawai Man Singh School', 'Jaipur', 'Jaipur', 'Rajasthan', 'CBSE', '302001', 'RJ001'],
    ['Jodhpur Public School', 'Jodhpur', 'Jodhpur', 'Rajasthan', 'CBSE', '342001', 'RJ002'],
    // West Bengal
    ['South Point School', 'Kolkata', 'Kolkata', 'West Bengal', 'CBSE', '700020', 'WB001'],
    ['La Martiniere for Boys', 'Kolkata', 'Kolkata', 'West Bengal', 'ICSE', '700016', 'WB002'],
    ['Siliguri School', 'Siliguri', 'Darjeeling', 'West Bengal', 'CBSE', '734001', 'WB003'],
    // Gujarat
    ['Nirma International School', 'Ahmedabad', 'Ahmedabad', 'Gujarat', 'CBSE', '380001', 'GJ001'],
    ['Surat International School', 'Surat', 'Surat', 'Gujarat', 'CBSE', '395001', 'GJ002'],
    // Telangana
    ['Hyderabad Public School', 'Hyderabad', 'Hyderabad', 'Telangana', 'CBSE', '500001', 'TS001'],
    ['Oakridge International School', 'Hyderabad', 'Hyderabad', 'Telangana', 'CBSE', '500081', 'TS002'],
    // Andhra Pradesh
    ['Narayana E-Techno School', 'Vijayawada', 'Krishna', 'Andhra Pradesh', 'CBSE', '520001', 'AP001'],
    // Punjab
    ['Guru Nanak Public School', 'Amritsar', 'Amritsar', 'Punjab', 'CBSE', '143001', 'PB001'],
    ['Chandigarh Model School', 'Chandigarh', 'Chandigarh', 'Chandigarh', 'CBSE', '160001', 'CH001'],
    // Bihar
    ['Notre Dame Academy', 'Patna', 'Patna', 'Bihar', 'ICSE', '800001', 'BR001'],
    ['Kendriya Vidyalaya Patna', 'Patna', 'Patna', 'Bihar', 'CBSE', '800001', 'BR002'],
    // Madhya Pradesh
    ['Campion School', 'Bhopal', 'Bhopal', 'Madhya Pradesh', 'ICSE', '462001', 'MP001'],
    ['Delhi Public School Indore', 'Indore', 'Indore', 'Madhya Pradesh', 'CBSE', '452001', 'MP002'],
    // Haryana
    ['DPS Faridabad', 'Faridabad', 'Faridabad', 'Haryana', 'CBSE', '121001', 'HR001'],
    ['Gurugram International School', 'Gurugram', 'Gurugram', 'Haryana', 'CBSE', '122001', 'HR002'],
    // Kerala
    ['Bhavans Vidya Mandir', 'Kochi', 'Ernakulam', 'Kerala', 'CBSE', '682001', 'KL001'],
    ['St. Josephs High School', 'Thiruvananthapuram', 'Thiruvananthapuram', 'Kerala', 'CBSE', '695001', 'KL002'],
    // Assam
    ['Cotton Collegiate School', 'Guwahati', 'Kamrup Metropolitan', 'Assam', 'CBSE', '781001', 'AS001'],
    // Odisha
    ['SAI International School', 'Bhubaneswar', 'Khordha', 'Odisha', 'CBSE', '751001', 'OD001'],
    // Jharkhand
    ['Delhi Public School Ranchi', 'Ranchi', 'Ranchi', 'Jharkhand', 'CBSE', '834001', 'JH001'],
    // Himachal Pradesh
    ['Bishop Cotton School', 'Shimla', 'Shimla', 'Himachal Pradesh', 'ICSE', '171001', 'HP001'],
    // Rural schools
    ['Zila Parishad High School Wardha', 'Wardha', 'Wardha', 'Maharashtra', 'CBSE', '442001', 'MH006'],
    ['Government Higher Secondary School', 'Vellore', 'Vellore', 'Tamil Nadu', 'CBSE', '632001', 'TN006'],
    ['Eklavya Model Residential School', 'Korba', 'Korba', 'Chhattisgarh', 'CBSE', '495450', 'CG001'],
    ['Navodaya Vidyalaya Kishanganj', 'Kishanganj', 'Kishanganj', 'Bihar', 'CBSE', '855107', 'BR003'],
    ['Kasturba Gandhi Balika Vidyalaya', 'Sirohi', 'Sirohi', 'Rajasthan', 'CBSE', '307001', 'RJ003'],
  ];

  const insertSchool = db.prepare(`
    INSERT OR IGNORE INTO schools (name, city, district, state, board, pincode, udise_code) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  schools.forEach(s => insertSchool.run(...s));
  console.log('✅ Schools seeded');

  // ─── SUBJECTS ─────────────────────────────────────────────────────────────────
  const subjects = [
    // Class 1-5 (CBSE)
    ['Mathematics', '1', 'CBSE', null, '🔢', '#6366F1'],
    ['English', '1', 'CBSE', null, '📖', '#10B981'],
    ['Environmental Studies', '1', 'CBSE', null, '🌿', '#14B8A6'],
    ['Mathematics', '2', 'CBSE', null, '🔢', '#6366F1'],
    ['English', '2', 'CBSE', null, '📖', '#10B981'],
    ['Mathematics', '3', 'CBSE', null, '🔢', '#6366F1'],
    ['English', '3', 'CBSE', null, '📖', '#10B981'],
    ['EVS', '3', 'CBSE', null, '🌿', '#14B8A6'],
    ['Mathematics', '4', 'CBSE', null, '🔢', '#6366F1'],
    ['English', '4', 'CBSE', null, '📖', '#10B981'],
    ['EVS', '4', 'CBSE', null, '🌿', '#14B8A6'],
    ['Mathematics', '5', 'CBSE', null, '🔢', '#6366F1'],
    ['English', '5', 'CBSE', null, '📖', '#10B981'],
    ['EVS', '5', 'CBSE', null, '🌿', '#14B8A6'],
    // Class 6-8 (CBSE)
    ['Mathematics', '6', 'CBSE', null, '🔢', '#6366F1'],
    ['Science', '6', 'CBSE', null, '🔬', '#8B5CF6'],
    ['Social Science', '6', 'CBSE', null, '🌍', '#F59E0B'],
    ['English', '6', 'CBSE', null, '📖', '#10B981'],
    ['Hindi', '6', 'CBSE', null, '📝', '#EC4899'],
    ['Mathematics', '7', 'CBSE', null, '🔢', '#6366F1'],
    ['Science', '7', 'CBSE', null, '🔬', '#8B5CF6'],
    ['Social Science', '7', 'CBSE', null, '🌍', '#F59E0B'],
    ['English', '7', 'CBSE', null, '📖', '#10B981'],
    ['Mathematics', '8', 'CBSE', null, '🔢', '#6366F1'],
    ['Science', '8', 'CBSE', null, '🔬', '#8B5CF6'],
    ['Social Science', '8', 'CBSE', null, '🌍', '#F59E0B'],
    // Class 9-10 (CBSE)
    ['Mathematics', '9', 'CBSE', null, '🔢', '#6366F1'],
    ['Science', '9', 'CBSE', null, '🔬', '#8B5CF6'],
    ['Social Science', '9', 'CBSE', null, '🌍', '#F59E0B'],
    ['English', '9', 'CBSE', null, '📖', '#10B981'],
    ['Hindi', '9', 'CBSE', null, '📝', '#EC4899'],
    ['Mathematics', '10', 'CBSE', null, '🔢', '#6366F1'],
    ['Science', '10', 'CBSE', null, '🔬', '#8B5CF6'],
    ['Social Science', '10', 'CBSE', null, '🌍', '#F59E0B'],
    ['English', '10', 'CBSE', null, '📖', '#10B981'],
    // Class 11-12 Science
    ['Physics', '11', 'CBSE', 'Science', '⚡', '#6366F1'],
    ['Chemistry', '11', 'CBSE', 'Science', '🧪', '#8B5CF6'],
    ['Biology', '11', 'CBSE', 'Biology', '🧬', '#10B981'],
    ['Mathematics', '11', 'CBSE', 'Maths', '🔢', '#F59E0B'],
    ['English', '11', 'CBSE', null, '📖', '#EC4899'],
    ['Physics', '12', 'CBSE', 'Science', '⚡', '#6366F1'],
    ['Chemistry', '12', 'CBSE', 'Science', '🧪', '#8B5CF6'],
    ['Biology', '12', 'CBSE', 'Biology', '🧬', '#10B981'],
    ['Mathematics', '12', 'CBSE', 'Maths', '🔢', '#F59E0B'],
    // Class 11-12 Commerce
    ['Accountancy', '11', 'CBSE', 'Commerce', '💼', '#6366F1'],
    ['Business Studies', '11', 'CBSE', 'Commerce', '📊', '#8B5CF6'],
    ['Economics', '11', 'CBSE', 'Commerce', '📈', '#10B981'],
    ['Accountancy', '12', 'CBSE', 'Commerce', '💼', '#6366F1'],
    ['Business Studies', '12', 'CBSE', 'Commerce', '📊', '#8B5CF6'],
    ['Economics', '12', 'CBSE', 'Commerce', '📈', '#10B981'],
    // Class 11-12 Humanities
    ['History', '11', 'CBSE', 'Humanities', '🏛️', '#6366F1'],
    ['Geography', '11', 'CBSE', 'Humanities', '🗺️', '#8B5CF6'],
    ['Political Science', '11', 'CBSE', 'Humanities', '⚖️', '#10B981'],
    ['History', '12', 'CBSE', 'Humanities', '🏛️', '#6366F1'],
    ['Geography', '12', 'CBSE', 'Humanities', '🗺️', '#8B5CF6'],
    ['Political Science', '12', 'CBSE', 'Humanities', '⚖️', '#10B981'],
  ];

  const insertSubject = db.prepare(`
    INSERT OR IGNORE INTO subjects (name, class_grade, board, stream, icon, color) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  subjects.forEach(s => insertSubject.run(...s));
  console.log('✅ Subjects seeded');

  // ─── CHAPTERS (Physics 11 as example - full NCERT) ────────────────────────────
  const physicsSubject = db.prepare(`SELECT id FROM subjects WHERE name='Physics' AND class_grade='11'`).get();
  const mathSubject = db.prepare(`SELECT id FROM subjects WHERE name='Mathematics' AND class_grade='10'`).get();
  const scienceSubject10 = db.prepare(`SELECT id FROM subjects WHERE name='Science' AND class_grade='10'`).get();
  const ssSubject9 = db.prepare(`SELECT id FROM subjects WHERE name='Social Science' AND class_grade='9'`).get();

  const insertChapter = db.prepare(`
    INSERT OR IGNORE INTO chapters (subject_id, title, chapter_number, description) 
    VALUES (?, ?, ?, ?)
  `);

  if (physicsSubject) {
    const physicsChapters = [
      ['Physical World', 1, 'Introduction to physics and its scope'],
      ['Units and Measurements', 2, 'SI units, dimensional analysis, error analysis'],
      ['Motion in a Straight Line', 3, 'Kinematics, velocity, acceleration, equations of motion'],
      ['Motion in a Plane', 4, 'Vectors, projectile motion, circular motion'],
      ['Laws of Motion', 5, "Newton's laws, friction, inertia"],
      ['Work, Energy and Power', 6, 'Work-energy theorem, conservation of energy'],
      ['Systems of Particles and Rotational Motion', 7, 'Centre of mass, torque, angular momentum'],
      ['Gravitation', 8, "Kepler's laws, universal gravitation, satellites"],
      ['Mechanical Properties of Solids', 9, 'Stress, strain, elastic moduli'],
      ['Mechanical Properties of Fluids', 10, 'Pascal law, Bernoulli theorem, viscosity'],
      ['Thermal Properties of Matter', 11, 'Temperature, heat, specific heat, calorimetry'],
      ['Thermodynamics', 12, 'Laws of thermodynamics, heat engines'],
      ['Kinetic Theory', 13, 'Kinetic theory of gases, equipartition of energy'],
      ['Oscillations', 14, 'SHM, simple pendulum, resonance'],
      ['Waves', 15, 'Wave motion, sound waves, Doppler effect'],
    ];
    physicsChapters.forEach(([title, num, desc]) => insertChapter.run(physicsSubject.id, title, num, desc));
  }

  if (mathSubject) {
    const mathChapters = [
      ['Real Numbers', 1, 'Euclid division lemma, irrational numbers'],
      ['Polynomials', 2, 'Zeros, division algorithm for polynomials'],
      ['Pair of Linear Equations in Two Variables', 3, 'Graphical and algebraic methods'],
      ['Quadratic Equations', 4, 'Factorization, quadratic formula'],
      ['Arithmetic Progressions', 5, 'nth term, sum of AP'],
      ['Triangles', 6, 'Similarity, Pythagoras theorem'],
      ['Coordinate Geometry', 7, 'Distance formula, section formula, area'],
      ['Introduction to Trigonometry', 8, 'Trigonometric ratios, identities'],
      ['Applications of Trigonometry', 9, 'Heights and distances'],
      ['Circles', 10, 'Tangent, chord, angle subtended'],
      ['Areas Related to Circles', 11, 'Circumference, area, sector'],
      ['Surface Areas and Volumes', 12, 'Combinations of solids'],
      ['Statistics', 13, 'Mean, median, mode'],
      ['Probability', 14, 'Classical probability, events'],
    ];
    mathChapters.forEach(([title, num, desc]) => insertChapter.run(mathSubject.id, title, num, desc));
  }

  if (scienceSubject10) {
    const sciChapters = [
      ['Chemical Reactions and Equations', 1, 'Types of chemical reactions, balancing equations'],
      ['Acids, Bases and Salts', 2, 'Properties, pH scale, salts'],
      ['Metals and Non-metals', 3, 'Physical and chemical properties'],
      ['Carbon and its Compounds', 4, 'Organic chemistry, hydrocarbons'],
      ['Life Processes', 5, 'Nutrition, respiration, transportation, excretion'],
      ['Control and Coordination', 6, 'Nervous system, hormones'],
      ['How do Organisms Reproduce?', 7, 'Asexual and sexual reproduction'],
      ['Heredity and Evolution', 8, "Mendel's laws, Darwin's theory"],
      ['Light – Reflection and Refraction', 9, 'Mirrors and lenses'],
      ['Human Eye and Colourful World', 10, 'Defects of vision, dispersion'],
      ['Electricity', 11, "Ohm's law, circuits, power"],
      ['Magnetic Effects of Electric Current', 12, 'Electromagnet, motor, generator'],
      ['Our Environment', 13, 'Ecosystem, food chains, ozone'],
    ];
    sciChapters.forEach(([title, num, desc]) => insertChapter.run(scienceSubject10.id, title, num, desc));
  }
  console.log('✅ Chapters seeded');

  // ─── CONTENT (Sample entries linking to YouTube / placeholder PDFs) ────────────
  const insertContent = db.prepare(`
    INSERT OR IGNORE INTO content (chapter_id, title, type, url, filename, duration_mins, size_mb) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const physicsChapters = db.prepare(`SELECT id FROM chapters WHERE subject_id=?`).all(physicsSubject?.id || 0);
  if (physicsChapters.length > 0) {
    const ch1 = physicsChapters[0].id;
    const ch2 = physicsChapters[1].id;
    const ch3 = physicsChapters[2].id;
    insertContent.run(ch1, 'Physical World - Introduction', 'video', 'https://www.youtube.com/embed/ZihywtixUYo', null, 45, null);
    insertContent.run(ch1, 'Physical World - NCERT Notes', 'pdf', null, 'physical-world-notes.pdf', null, 1.2);
    insertContent.run(ch2, 'Units & Measurements - Lecture 1', 'video', 'https://www.youtube.com/embed/3J5Sh1V2jFQ', null, 52, null);
    insertContent.run(ch2, 'Units & Measurements - NCERT Solutions', 'pdf', null, 'units-measurement-solutions.pdf', null, 2.1);
    insertContent.run(ch3, 'Motion in Straight Line - Part 1', 'video', 'https://www.youtube.com/embed/MAS6mBRZZXA', null, 48, null);
    insertContent.run(ch3, 'Kinematics Notes', 'pdf', null, 'kinematics-notes.pdf', null, 1.8);
  }

  const mathChapters10 = db.prepare(`SELECT id FROM chapters WHERE subject_id=?`).all(mathSubject?.id || 0);
  if (mathChapters10.length > 0) {
    insertContent.run(mathChapters10[0].id, 'Real Numbers - Video Lecture', 'video', 'https://www.youtube.com/embed/Yw_5JgmRFXM', null, 40, null);
    insertContent.run(mathChapters10[0].id, 'Real Numbers - Chapter Notes', 'pdf', null, 'real-numbers-notes.pdf', null, 1.0);
    insertContent.run(mathChapters10[3].id, 'Quadratic Equations - Full Lecture', 'video', 'https://www.youtube.com/embed/4PYnLGNtWoE', null, 55, null);
    insertContent.run(mathChapters10[7].id, 'Trigonometry - Introduction', 'video', 'https://www.youtube.com/embed/F21S9Wpi0y8', null, 60, null);
  }
  console.log('✅ Content seeded');

  // ─── QUIZZES ───────────────────────────────────────────────────────────────────
  const insertQuiz = db.prepare(`
    INSERT OR IGNORE INTO quizzes (chapter_id, subject_id, title, description, duration_mins, total_marks) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertQ = db.prepare(`
    INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_option, marks) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const ch3Id = physicsChapters[2]?.id;
  if (ch3Id) {
    const q1 = insertQuiz.run(ch3Id, physicsSubject?.id, 'Motion in a Straight Line - Test 1', 'Test your understanding of kinematics', 15, 20);
    const qid = q1.lastInsertRowid;
    const qs = db.prepare(`SELECT COUNT(*) as c FROM quiz_questions WHERE quiz_id=?`).get(qid);
    if (qs.c === 0) {
      insertQ.run(qid, 'A body starts from rest and moves with uniform acceleration of 2 m/s². Find velocity after 5 seconds.', '5 m/s', '10 m/s', '15 m/s', '20 m/s', 'B', 4);
      insertQ.run(qid, 'The slope of velocity-time graph gives:', 'Displacement', 'Distance', 'Acceleration', 'Speed', 'C', 4);
      insertQ.run(qid, 'If a car decelerates from 72 km/h to 0 in 4 seconds, find deceleration.', '3 m/s²', '5 m/s²', '4 m/s²', '6 m/s²', 'B', 4);
      insertQ.run(qid, 'Area under velocity-time graph gives:', 'Acceleration', 'Displacement', 'Velocity', 'Force', 'B', 4);
      insertQ.run(qid, 'A ball is thrown upward with 20 m/s. Maximum height (g=10): ', '20 m', '40 m', '10 m', '50 m', 'A', 4);
    }
  }

  if (mathChapters10.length > 3) {
    const q2 = insertQuiz.run(mathChapters10[3].id, mathSubject?.id, 'Quadratic Equations - Chapter Test', 'Test your understanding of quadratic equations', 20, 20);
    const qid2 = q2.lastInsertRowid;
    const qs2 = db.prepare(`SELECT COUNT(*) as c FROM quiz_questions WHERE quiz_id=?`).get(qid2);
    if (qs2.c === 0) {
      insertQ.run(qid2, 'Which of these is a quadratic equation?', 'x³ + 2 = 0', 'x² + 3x + 2 = 0', '2x + 5 = 0', 'x + 1/x = 2', 'B', 4);
      insertQ.run(qid2, 'The discriminant of x² - 5x + 6 = 0 is:', '1', '25', '0', '-1', 'A', 4);
      insertQ.run(qid2, 'Roots of x² - 7x + 12 = 0 are:', '3, 4', '2, 6', '1, 12', '4, 5', 'A', 4);
      insertQ.run(qid2, 'For equal roots, discriminant is:', 'Positive', 'Negative', 'Zero', 'Undefined', 'C', 4);
      insertQ.run(qid2, 'Sum of roots of 2x² + 6x + 3 = 0 is:', '-3', '3/2', '-3/2', '3', 'A', 4);
    }
  }
  console.log('✅ Quizzes seeded');

  // ─── SCHOLARSHIPS ──────────────────────────────────────────────────────────────
  const insertScholarship = db.prepare(`
    INSERT OR IGNORE INTO scholarships (title, amount, provider, deadline, eligibility, category, description, apply_url) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const scholarships = [
    ['National Merit Scholarship', '₹50,000/year', 'Ministry of Education, Govt. of India', '2027-06-30', 'Class 10-12 students with 75%+ marks', 'Merit Based', 'Awarded to meritorious students from economically weaker sections. Covers tuition and hostel fees.', 'https://scholarships.gov.in'],
    ['SC/ST Post-Matric Scholarship', '₹30,000/year', 'Ministry of Social Justice and Empowerment', '2027-07-15', 'SC/ST students, family income < 2.5 lakh/year', 'Social Welfare', 'Central sector scholarship for SC/ST students pursuing post-matric education.', 'https://scholarships.gov.in'],
    ['Girl Child Education Grant', '₹40,000/year', 'State Government (Various)', '2027-05-31', 'Female students in rural areas, Class 9-12', 'Women Empowerment', 'Supporting girl child education in rural and semi-urban areas. Covers books, uniform, and fees.', 'https://scholarships.gov.in'],
    ['Pre-Matric Scholarship for Minorities', '₹20,000/year', 'Ministry of Minority Affairs', '2027-06-30', 'Minority students, Class 1-10, income < 1 lakh', 'Minority Welfare', 'Central sector scheme for minority community students to prevent dropout.', 'https://minorityaffairs.gov.in/scholarships'],
    ['Pragati Scholarship for Girls', '₹50,000/year', 'AICTE', '2027-04-30', 'Girls in technical education, family income < 8 lakh', 'Technical Education', 'For girl students pursuing technical diploma or degree. Covers tuition and incidentals.', 'https://www.aicte-india.org/bureaus/pgms/pradyum'],
    ['OBC Post-Matric Scholarship', '₹25,000/year', 'Ministry of Social Justice', '2027-07-31', 'OBC students, post-matric level, income < 1 lakh', 'Social Welfare', 'Financial assistance for OBC students pursuing post-matric courses.', 'https://scholarships.gov.in'],
    ['National Means Cum Merit Scholarship', '₹12,000/year', 'Ministry of Education', '2027-08-15', 'Class 9-12 students with family income < 1.5 lakh', 'Merit Cum Means', 'For meritorious students from economically weaker sections to arrest dropouts after class 8.', 'https://scholarships.gov.in'],
    ['Inspire Scholarship', '₹80,000/year', 'DST, Govt. of India', '2027-05-15', 'Class 11-12 Science students in top 1% of class 10 board', 'Science Excellence', 'Scholarship for pursuing natural and basic science at undergraduate level.', 'https://online-inspire.gov.in'],
  ];
  scholarships.forEach(s => insertScholarship.run(...s));

  // ─── COMPETITIONS ──────────────────────────────────────────────────────────────
  const insertComp = db.prepare(`
    INSERT OR IGNORE INTO competitions (title, prize, organizer, event_date, registration_deadline, description, apply_url, level) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const competitions = [
    ['National Science Olympiad (NSO)', '₹1,00,000 + Gold Medal', 'Science Olympiad Foundation', '2027-11-15', '2027-09-30', 'Annual science competition for students of Class 1-12', 'https://www.sofworld.org', 'National'],
    ['Mathematics Olympiad (IMO)', '₹75,000 + Medal', 'SOF / Homi Bhabha Science', '2027-10-20', '2027-08-31', 'International standard math competition at national level', 'https://www.sofworld.org', 'International'],
    ['National Talent Search Examination', 'Stipend ₹1,250-2,000/month', 'NCERT', '2027-11-08', '2027-08-15', 'NTSE identifies talented students at class 10 level', 'https://ncert.nic.in/ntse', 'National'],
    ['Kishore Vaigyanik Protsahan Yojana', 'Fellowship ₹5,000-7,000/month', 'DST & IISc', '2027-11-01', '2027-09-15', 'KVPY encourages students to pursue research careers in science', 'https://kvpy.iisc.ac.in', 'National'],
    ['National Junior Math Olympiad', '₹50,000 + Certificate', 'HBCSE', '2027-09-12', '2027-07-31', 'Stage 1 of prestigious International Mathematical Olympiad selection', 'https://olympiads.hbcse.tifr.res.in', 'National'],
    ['Aryabhatta Ganit Challenge', '₹25,000 + Trophy', 'NCERT & CBSE', '2027-09-20', '2027-08-30', 'For Class 8-10 CBSE students to improve mathematical reasoning', 'https://cbseacademic.nic.in', 'National'],
  ];
  competitions.forEach(c => insertComp.run(...c));
  console.log('✅ Scholarships & Competitions seeded');

  // ─── EXTRA CHAPTERS (so more class 9/10 subjects have content) ──────────────
  const extraChapters = {
    "Social Science|10": [
      ['The Rise of Nationalism in Europe', 'French Revolution, unification of Germany and Italy'],
      ['Nationalism in India', 'Non-cooperation, civil disobedience, sense of belonging'],
      ['Resources and Development', 'Types of resources, land use, soil conservation'],
      ['Power Sharing', 'Belgium and Sri Lanka case studies, forms of power sharing'],
      ['Development', 'Income, public facilities, sustainability'],
    ],
    "English|10": [
      ['A Letter to God', 'Faith, hope and irony'],
      ['Nelson Mandela: Long Walk to Freedom', 'Freedom, courage and apartheid'],
      ['Two Stories about Flying', 'Overcoming fear'],
      ['From the Diary of Anne Frank', 'Diary writing and self-expression'],
    ],
    "Mathematics|9": [
      ['Number Systems', 'Rational and irrational numbers, real number line'],
      ['Polynomials', 'Zeroes, remainder theorem, factorisation'],
      ['Coordinate Geometry', 'Cartesian plane, plotting points'],
      ['Linear Equations in Two Variables', 'Solutions and graphs'],
      ['Lines and Angles', 'Pairs of angles, parallel lines'],
    ],
    "Science|9": [
      ['Matter in Our Surroundings', 'States of matter, evaporation'],
      ['Is Matter Around Us Pure?', 'Mixtures, solutions, separation'],
      ['Atoms and Molecules', 'Laws of chemical combination, mole concept'],
      ['The Fundamental Unit of Life', 'Cell structure and organelles'],
      ['Motion', 'Distance, displacement, uniform and non-uniform motion'],
    ],
  };
  for (const [key, chapters] of Object.entries(extraChapters)) {
    const [name, grade] = key.split('|');
    const subj = db.prepare('SELECT id FROM subjects WHERE name=? AND class_grade=?').get(name, grade);
    if (!subj) continue;
    chapters.forEach(([title, desc], idx) => insertChapter.run(subj.id, title, idx + 1, desc));
  }

  // Notes for a few chapters so every content type shows up
  const sciChaps = db.prepare('SELECT id, title FROM chapters WHERE subject_id=? ORDER BY chapter_number').all(scienceSubject10?.id || 0);
  if (sciChaps.length > 10) {
    insertContent.run(sciChaps[0].id, 'Chemical Reactions - Quick Notes', 'pdf', null, 'chemical-reactions-notes.pdf', null, 0.9);
    insertContent.run(sciChaps[0].id, 'Balancing Equations - Video', 'video', 'https://www.youtube.com/embed/eNsVaUCzvLA', null, 22, null);
    insertContent.run(sciChaps[10].id, 'Electricity - Ohm\'s Law Explained', 'video', 'https://www.youtube.com/embed/HsLLq6Rm5tU', null, 18, null);
    insertContent.run(sciChaps[10].id, 'Electricity - Formula Sheet', 'pdf', null, 'electricity-formulas.pdf', null, 0.5);

    // A third quiz for Science 10
    const q3 = insertQuiz.run(sciChaps[10].id, scienceSubject10.id, 'Electricity - Quick Check', 'Ohm\'s law, resistance and power', 10, 20);
    const qid3 = q3.lastInsertRowid;
    insertQ.run(qid3, 'The SI unit of electric current is:', 'Volt', 'Ampere', 'Ohm', 'Watt', 'B', 4);
    insertQ.run(qid3, 'Ohm\'s law states that V equals:', 'I/R', 'IR', 'I²R', 'R/I', 'B', 4);
    insertQ.run(qid3, 'Resistors connected in series have:', 'Same voltage', 'Same current', 'Zero resistance', 'Infinite current', 'B', 4);
    insertQ.run(qid3, 'Electric power P is given by:', 'VI', 'V/I', 'I/V', 'V + I', 'A', 4);
    insertQ.run(qid3, 'A 2 Ω resistor carries 3 A. The voltage across it is:', '1.5 V', '5 V', '6 V', '9 V', 'C', 4);
  }
  console.log('✅ Extra chapters, notes & quizzes seeded');

  // ─── DEMO USERS ────────────────────────────────────────────────────────────────
  const demoSchool = db.prepare(`SELECT id, name FROM schools WHERE udise_code='MH006'`).get()
    || db.prepare(`SELECT id, name FROM schools LIMIT 1`).get();
  const schoolId = demoSchool?.id || null;
  const schoolName = demoSchool?.name || 'Demo School';

  const hash = bcrypt.hashSync('password123', 10);
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, mobile, password_hash, role, class_grade, roll_number, school_id, school_name, board)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CBSE')
  `);
  insertUser.run('Arjun Sharma', 'student@demo.com', '9876543210', hash, 'student', '10', 'S001', schoolId, schoolName);
  insertUser.run('Priya Verma', 'teacher@demo.com', '9876543211', hash, 'teacher', null, null, schoolId, schoolName);
  insertUser.run('Ravi Sharma', 'parent@demo.com', '9876543212', hash, 'parent', null, null, schoolId, schoolName);

  // Classmates, so attendance marking and leaderboards have people in them
  const classmates = [
    ['Meera Patil', 'S002'], ['Kabir Khan', 'S003'], ['Ananya Iyer', 'S004'],
    ['Rohan Das', 'S005'], ['Sneha Yadav', 'S006'], ['Vikram Singh', 'S007'],
  ];
  classmates.forEach(([name, roll], i) => {
    insertUser.run(name, `${roll.toLowerCase()}@demo.com`, `90000000${i + 10}`, hash, 'student', '10', roll, schoolId, schoolName);
  });

  const student = db.prepare(`SELECT id FROM users WHERE email='student@demo.com'`).get();
  const parent = db.prepare(`SELECT id FROM users WHERE email='parent@demo.com'`).get();
  const teacher = db.prepare(`SELECT id FROM users WHERE email='teacher@demo.com'`).get();
  if (student && parent) {
    db.prepare(`INSERT OR IGNORE INTO parent_child (parent_id, child_id) VALUES (?, ?)`).run(parent.id, student.id);
  }

  // ─── ATTENDANCE (last ~6 weeks, weekdays) ────────────────────────────────────
  const allStudents = db.prepare(`SELECT id, roll_number FROM users WHERE role='student' AND class_grade='10'`).all();
  const insertAtt = db.prepare(`INSERT OR IGNORE INTO attendance (student_id, teacher_id, date, status, class_grade, school_id) VALUES (?, ?, ?, ?, '10', ?)`);
  // deterministic pseudo-random so demo data looks the same every reset
  let seed = 42;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const presenceRate = { S001: 0.9, S002: 0.95, S003: 0.65, S004: 0.88, S005: 0.7, S006: 0.97, S007: 0.8 };
  const today = new Date();
  for (let i = 42; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    for (const s of allStudents) {
      const r = rand();
      const rate = presenceRate[s.roll_number] ?? 0.85;
      const status = r < rate ? 'present' : r < rate + 0.04 ? 'late' : 'absent';
      insertAtt.run(s.id, teacher.id, dateStr, status, schoolId);
    }
  }

  // ─── QUIZ ATTEMPTS (leaderboard + performance charts) ────────────────────────
  const quizzes = db.prepare("SELECT q.id, q.total_marks FROM quizzes q JOIN subjects s ON q.subject_id = s.id WHERE s.class_grade = '10' ORDER BY q.id").all();
  const insertAttempt = db.prepare(`
    INSERT INTO quiz_attempts (quiz_id, user_id, score, total_marks, correct_answers, wrong_answers, time_taken_secs, answers, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?)
  `);
  const now = Math.floor(Date.now() / 1000);
  quizzes.slice(0, 2).forEach((qz, qi) => {
    allStudents.forEach((s, si) => {
      if (s.roll_number === 'S001' && qi === 1) return; // leave one quiz for Arjun to try
      const correct = Math.max(1, Math.min(5, Math.round(2 + rand() * 3.4)));
      insertAttempt.run(qz.id, s.id, correct * 4, qz.total_marks, correct, 5 - correct, 240 + Math.round(rand() * 500), now - (qi * 6 + si) * 86400);
    });
  });
  console.log('✅ Demo users, attendance & quiz attempts seeded');
}

// ─── CLI: `npm run seed` resets the database and seeds fresh demo data ────────
if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  closeDb();
  for (const f of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
    if (existsSync(f)) unlinkSync(f);
  }
  console.log('🧹 Old database removed');
  seedDatabase(getDb());
  closeDb();
}
