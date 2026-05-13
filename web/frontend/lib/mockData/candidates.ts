// Mock candidate data type
export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  avatar?: string;
  matchScore: number; // 0-100
  appliedDate: string;
  experience: string; // e.g., "5 years"
  currentRole: string;
  skills: string[];
  education: string;
  resumeUrl?: string;
  status: "new" | "reviewed" | "shortlisted" | "rejected" | "hired";
  motivationLetter: string;
  aiAnalysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string;
    skillMatch: { skill: string; matchPercentage: number }[];
  };
}

// Mock candidates for a job
export const mockCandidates: Candidate[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+33 6 12 34 56 78",
    location: "Paris, France",
    matchScore: 95,
    appliedDate: "2025-12-10T10:30:00Z",
    experience: "6 years",
    currentRole: "Senior Frontend Developer",
    skills: ["React", "TypeScript", "Node.js", "Next.js", "TailwindCSS"],
    education: "Master's in Computer Science",
    status: "shortlisted",
    motivationLetter: "Dear Hiring Manager,\n\nI am writing to express my strong interest in the Frontend Developer position. With over 6 years of experience in building scalable web applications using React and TypeScript, I am confident in my ability to contribute to your team.\n\nThroughout my career, I have successfully delivered multiple enterprise-level projects, focusing on performance optimization and user experience. I am particularly excited about this opportunity as it aligns perfectly with my expertise in Next.js and modern frontend architectures.\n\nI look forward to discussing how my skills can benefit your organization.\n\nBest regards,\nSarah Johnson",
    aiAnalysis: {
      strengths: [
        "Strong technical skills in React and TypeScript",
        "6 years of relevant experience",
        "Next.js expertise aligns with job requirements",
        "Master's degree in Computer Science",
        "Excellent communication skills evident in motivation letter"
      ],
      weaknesses: [
        "No specific mention of team leadership experience",
        "Limited backend experience mentioned"
      ],
      recommendations: "Excellent candidate with strong technical background. Recommend moving to final interview stage. During interview, explore leadership potential and backend capabilities.",
      skillMatch: [
        { skill: "React", matchPercentage: 100 },
        { skill: "TypeScript", matchPercentage: 95 },
        { skill: "Node.js", matchPercentage: 85 },
        { skill: "Next.js", matchPercentage: 100 },
        { skill: "TailwindCSS", matchPercentage: 90 }
      ]
    }
  },
  {
    id: "2",
    name: "Alexandre Martin",
    email: "alexandre.martin@email.com",
    phone: "+33 6 23 45 67 89",
    location: "Lyon, France",
    matchScore: 92,
    appliedDate: "2025-12-09T14:20:00Z",
    experience: "5 years",
    currentRole: "Full Stack Developer",
    skills: ["React", "Node.js", "PostgreSQL", "AWS", "Docker"],
    education: "Bachelor's in Software Engineering",
    status: "reviewed",
    motivationLetter: "Hello,\n\nI am very interested in joining your team as a Full Stack Developer. My 5 years of experience spans both frontend and backend development, with particular strength in React and Node.js ecosystems.\n\nI have extensive experience with cloud infrastructure (AWS) and containerization (Docker), which I believe will be valuable for your projects. I'm passionate about building efficient, scalable applications and continuously learning new technologies.\n\nThank you for considering my application.\n\nAlexandre Martin",
    aiAnalysis: {
      strengths: [
        "Well-rounded full-stack expertise",
        "Strong DevOps skills (AWS, Docker)",
        "5 years of proven experience",
        "Database expertise with PostgreSQL"
      ],
      weaknesses: [
        "Less frontend-focused compared to requirements",
        "Bachelor's degree vs Master's from top candidate"
      ],
      recommendations: "Strong candidate with versatile skill set. The DevOps expertise is a bonus. Consider for roles requiring full-stack capabilities.",
      skillMatch: [
        { skill: "React", matchPercentage: 90 },
        { skill: "Node.js", matchPercentage: 95 },
        { skill: "PostgreSQL", matchPercentage: 100 },
        { skill: "AWS", matchPercentage: 88 },
        { skill: "Docker", matchPercentage: 92 }
      ]
    }
  },
  {
    id: "3",
    name: "Emma Dubois",
    email: "emma.dubois@email.com",
    phone: "+33 6 34 56 78 90",
    location: "Marseille, France",
    matchScore: 88,
    appliedDate: "2025-12-08T09:15:00Z",
    experience: "4 years",
    currentRole: "Frontend Developer",
    skills: ["React", "JavaScript", "CSS", "Redux", "Git"],
    education: "Bachelor's in Computer Science",
    status: "reviewed",
    motivationLetter: "Dear Team,\n\nI am excited to apply for the Frontend Developer role. My 4 years of experience in React development have equipped me with strong problem-solving skills and attention to detail.\n\nI specialize in creating responsive, accessible user interfaces and have a deep understanding of state management using Redux. I am eager to bring my expertise to your innovative projects.\n\nLooking forward to hearing from you.\n\nEmma Dubois",
    aiAnalysis: {
      strengths: [
        "Solid React fundamentals",
        "State management expertise (Redux)",
        "Focus on accessibility and responsive design",
        "4 years of relevant experience"
      ],
      weaknesses: [
        "JavaScript instead of TypeScript",
        "Skill set less modern compared to other candidates",
        "No Next.js experience mentioned"
      ],
      recommendations: "Good candidate but may require training on TypeScript and Next.js. Best suited for roles with less stringent modern framework requirements.",
      skillMatch: [
        { skill: "React", matchPercentage: 85 },
        { skill: "JavaScript", matchPercentage: 80 },
        { skill: "CSS", matchPercentage: 90 },
        { skill: "Redux", matchPercentage: 95 },
        { skill: "Git", matchPercentage: 85 }
      ]
    }
  },
  {
    id: "4",
    name: "Lucas Bernard",
    email: "lucas.bernard@email.com",
    phone: "+33 6 45 67 89 01",
    location: "Paris, France",
    matchScore: 85,
    appliedDate: "2025-12-07T16:45:00Z",
    experience: "3 years",
    currentRole: "Web Developer",
    skills: ["React", "TypeScript", "HTML", "CSS", "JavaScript"],
    education: "Bachelor's in Information Technology",
    status: "new",
    motivationLetter: "Hi,\n\nI want to apply for this position because I think it matches my skills. I have worked with React and TypeScript for 3 years and I am good at coding.\n\nPlease let me know if you need any information.\n\nThanks,\nLucas",
    aiAnalysis: {
      strengths: [
        "TypeScript proficiency",
        "React experience",
        "Located in Paris (same as job posting)"
      ],
      weaknesses: [
        "Brief, unprofessional motivation letter",
        "Limited years of experience",
        "Lacks specific achievements or projects",
        "Generic skill description"
      ],
      recommendations: "Technical skills appear adequate but motivation letter raises concerns about professionalism. Recommend requesting additional information or a more detailed cover letter before proceeding.",
      skillMatch: [
        { skill: "React", matchPercentage: 80 },
        { skill: "TypeScript", matchPercentage: 85 },
        { skill: "HTML", matchPercentage: 75 },
        { skill: "CSS", matchPercentage: 75 },
        { skill: "JavaScript", matchPercentage: 80 }
      ]
    }
  },
  {
    id: "5",
    name: "Sophie Leroy",
    email: "sophie.leroy@email.com",
    phone: "+33 6 56 78 90 12",
    location: "Toulouse, France",
    matchScore: 82,
    appliedDate: "2025-12-06T11:30:00Z",
    experience: "4 years",
    currentRole: "Frontend Engineer",
    skills: ["React", "Vue.js", "JavaScript", "Webpack", "SASS"],
    education: "Master's in Web Development",
    status: "reviewed",
    motivationLetter: "Dear Hiring Team,\n\nI am enthusiastic about the Frontend Engineer position at your company. My background includes 4 years of modern JavaScript framework development, with expertise in both React and Vue.js.\n\nI have a strong understanding of build tools and CSS preprocessing, which enables me to optimize development workflows. I am particularly interested in your company's focus on innovative web technologies.\n\nI would welcome the opportunity to discuss my qualifications further.\n\nSincerely,\nSophie Leroy",
    aiAnalysis: {
      strengths: [
        "Versatile framework knowledge (React & Vue.js)",
        "Master's degree in Web Development",
        "Build tool expertise (Webpack)",
        "Professional communication"
      ],
      weaknesses: [
        "JavaScript instead of TypeScript",
        "Vue.js not required for this role",
        "No specific React-focused projects mentioned"
      ],
      recommendations: "Qualified candidate with strong fundamentals. The Vue.js experience shows adaptability but may not be directly relevant. Worth interviewing to assess React depth.",
      skillMatch: [
        { skill: "React", matchPercentage: 80 },
        { skill: "Vue.js", matchPercentage: 90 },
        { skill: "JavaScript", matchPercentage: 82 },
        { skill: "Webpack", matchPercentage: 88 },
        { skill: "SASS", matchPercentage: 85 }
      ]
    }
  },
  {
    id: "6",
    name: "Thomas Petit",
    email: "thomas.petit@email.com",
    phone: "+33 6 67 89 01 23",
    location: "Bordeaux, France",
    matchScore: 78,
    appliedDate: "2025-12-05T13:20:00Z",
    experience: "2 years",
    currentRole: "Junior Developer",
    skills: ["React", "JavaScript", "HTML", "CSS"],
    education: "Bachelor's in Computer Science",
    status: "new",
    motivationLetter: "Dear Sir/Madam,\n\nI am writing to apply for the developer position. I recently graduated and have 2 years of internship and junior developer experience working with React.\n\nI am a fast learner and very motivated to grow my skills. This position would be a great opportunity for my career development.\n\nThank you for your consideration.\n\nThomas Petit",
    aiAnalysis: {
      strengths: [
        "Recent education",
        "Eager to learn",
        "React foundation"
      ],
      weaknesses: [
        "Only 2 years of experience (below requirement)",
        "Junior level skillset",
        "No TypeScript or advanced framework knowledge",
        "Limited technical depth"
      ],
      recommendations: "Entry-level candidate. Skills do not meet the position requirements. Not recommended unless considering for a junior role.",
      skillMatch: [
        { skill: "React", matchPercentage: 65 },
        { skill: "JavaScript", matchPercentage: 70 },
        { skill: "HTML", matchPercentage: 75 },
        { skill: "CSS", matchPercentage: 70 }
      ]
    }
  },
  {
    id: "7",
    name: "Marie Moreau",
    email: "marie.moreau@email.com",
    phone: "+33 6 78 90 12 34",
    location: "Nice, France",
    matchScore: 75,
    appliedDate: "2025-12-04T08:50:00Z",
    experience: "3 years",
    currentRole: "Software Developer",
    skills: ["JavaScript", "React", "Node.js", "MongoDB"],
    education: "Bachelor's in Software Engineering",
    status: "reviewed",
    motivationLetter: "Hello,\n\nI am interested in the developer role. I have experience with JavaScript and React, and I also know Node.js and MongoDB.\n\nI think I would be a good fit.\n\nMarie",
    aiAnalysis: {
      strengths: [
        "Full-stack potential with Node.js and MongoDB",
        "3 years of experience"
      ],
      weaknesses: [
        "Very brief, unprofessional motivation letter",
        "No TypeScript mentioned",
        "Lack of enthusiasm or specific interest in the company",
        "Missing key required skills"
      ],
      recommendations: "Poor application quality. The extremely brief motivation letter suggests lack of genuine interest. Not recommended for further consideration.",
      skillMatch: [
        { skill: "JavaScript", matchPercentage: 75 },
        { skill: "React", matchPercentage: 70 },
        { skill: "Node.js", matchPercentage: 72 },
        { skill: "MongoDB", matchPercentage: 68 }
      ]
    }
  },
  {
    id: "8",
    name: "Pierre Laurent",
    email: "pierre.laurent@email.com",
    phone: "+33 6 89 01 23 45",
    location: "Nantes, France",
    matchScore: 71,
    appliedDate: "2025-12-03T15:10:00Z",
    experience: "2 years",
    currentRole: "Web Developer",
    skills: ["HTML", "CSS", "JavaScript", "React"],
    education: "Bachelor's in Computer Science",
    status: "new",
    motivationLetter: "I saw your job posting and I would like to apply. I know HTML, CSS, JavaScript and React. I have been working for 2 years.\n\nPlease consider my application.\n\nPierre Laurent",
    aiAnalysis: {
      strengths: [
        "Basic web development skills",
        "React knowledge"
      ],
      weaknesses: [
        "Minimal effort in application",
        "Very short motivation letter",
        "Limited experience (2 years)",
        "No advanced or modern framework skills",
        "Lack of professionalism"
      ],
      recommendations: "Does not meet minimum requirements. The application shows minimal effort and professionalism. Reject.",
      skillMatch: [
        { skill: "HTML", matchPercentage: 70 },
        { skill: "CSS", matchPercentage: 68 },
        { skill: "JavaScript", matchPercentage: 65 },
        { skill: "React", matchPercentage: 60 }
      ]
    }
  },
  {
    id: "9",
    name: "Camille Roux",
    email: "camille.roux@email.com",
    phone: "+33 6 90 12 34 56",
    location: "Strasbourg, France",
    matchScore: 68,
    appliedDate: "2025-12-02T10:25:00Z",
    experience: "1 year",
    currentRole: "Junior Frontend Developer",
    skills: ["React", "JavaScript", "CSS", "Git"],
    education: "Bachelor's in Information Systems",
    status: "rejected",
    motivationLetter: "I want this job because I need experience and your company seems good.\n\nCamille",
    aiAnalysis: {
      strengths: [
        "Basic Git knowledge",
        "Some React exposure"
      ],
      weaknesses: [
        "Only 1 year of experience",
        "Extremely unprofessional motivation letter",
        "Shows no research about the company",
        "Focuses on personal need rather than value proposition",
        "Entry-level skills only"
      ],
      recommendations: "Rejected. Application shows no effort or genuine interest. Does not meet requirements.",
      skillMatch: [
        { skill: "React", matchPercentage: 55 },
        { skill: "JavaScript", matchPercentage: 60 },
        { skill: "CSS", matchPercentage: 65 },
        { skill: "Git", matchPercentage: 70 }
      ]
    }
  },
  {
    id: "10",
    name: "Julien Simon",
    email: "julien.simon@email.com",
    phone: "+33 6 01 23 45 67",
    location: "Lille, France",
    matchScore: 64,
    appliedDate: "2025-12-01T12:40:00Z",
    experience: "1 year",
    currentRole: "Developer Intern",
    skills: ["JavaScript", "HTML", "CSS"],
    education: "Bachelor's in Computer Science (In Progress)",
    status: "new",
    motivationLetter: "I am currently finishing my degree and looking for opportunities. I have done an internship where I learned JavaScript and some HTML/CSS.\n\nJulien",
    aiAnalysis: {
      strengths: [
        "Currently studying",
        "Has internship experience"
      ],
      weaknesses: [
        "Still in school",
        "Only 1 year of internship experience",
        "No React experience mentioned",
        "Very basic skill set",
        "Unprofessional, brief application"
      ],
      recommendations: "Not qualified for this position. Better suited for internship or junior entry-level roles. Reject.",
      skillMatch: [
        { skill: "JavaScript", matchPercentage: 50 },
        { skill: "HTML", matchPercentage: 60 },
        { skill: "CSS", matchPercentage: 55 }
      ]
    }
  },
];

// Function to get candidates for a specific job (sorted by match score)
export function getCandidatesForJob(jobId: string): Candidate[] {
  // In a real app, this would fetch from API
  // For now, return mock data sorted by match score
  return [...mockCandidates].sort((a, b) => b.matchScore - a.matchScore);
}

// Function to get candidate by ID
export function getCandidateById(candidateId: string): Candidate | null {
  return mockCandidates.find((c) => c.id === candidateId) || null;
}
