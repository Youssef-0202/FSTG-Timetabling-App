const STORAGE_KEY = 'mockJobs';

export interface JobSkill {
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  mandatory: boolean;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  job_type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  salary_min: number | null;
  salary_max: number | null;
  status: 'active' | 'closed' | 'draft';
  company_id: string;
  recruiter_id: string;
  skills: JobSkill[];
  created_at: string;
  updated_at: string;
}

// Job data without the ID (for creating new jobs)
export interface JobInput {
  title: string;
  description: string;
  location: string;
  job_type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  salary_min: number | null;
  salary_max: number | null;
  status: 'active' | 'closed' | 'draft';
  company_id: string;
  recruiter_id: string;
  skills: JobSkill[];
}

/**
 * Generate a unique ID for a new job
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all jobs from localStorage
 */
export function getJobs(): Job[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const jobs = JSON.parse(stored) as Job[];
    return jobs;
  } catch (error) {
    console.error('Error loading jobs from localStorage!', error);
    return [];
  }
}

/**
 * Get a single job by ID
 */
export function getJobById(id: string): Job | null {
  const jobs = getJobs();
  return jobs.find(job => job.id === id) || null;
}

/**
 * Get jobs by company ID
 */
export function getJobsByCompany(companyId: string): Job[] {
  const jobs = getJobs();
  return jobs.filter(job => job.company_id === companyId);
}

/**
 * Get jobs by recruiter ID
 */
export function getJobsByRecruiter(recruiterId: string): Job[] {
  const jobs = getJobs();
  return jobs.filter(job => job.recruiter_id === recruiterId);
}

/**
 * Get jobs by status
 */
export function getJobsByStatus(status: 'active' | 'closed' | 'draft'): Job[] {
  const jobs = getJobs();
  return jobs.filter(job => job.status === status);
}

/**
 * Add a new job
 */
export function addJob(jobData: JobInput): Job {
  try {
    const jobs = getJobs();

    const newJob: Job = {
      id: generateId(),
      ...jobData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    jobs.push(newJob);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));

    console.log('Job created:', newJob);
    return newJob;
  } catch (error) {
    console.error('Error adding job:', error);
    throw new Error('Failed to create job');
  }
}

/**
 * Update an existing job
 */
export function updateJob(id: string, updates: Partial<JobInput>): Job | null {
  try {
    const jobs = getJobs();
    const index = jobs.findIndex(job => job.id === id);

    if (index === -1) {
      console.error('Job not found:', id);
      return null;
    }

    jobs[index] = {
      ...jobs[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));

    console.log('Job updated:', jobs[index]);
    return jobs[index];
  } catch (error) {
    console.error('Error updating job:', error);
    throw new Error('Failed to update job');
  }
}

/**
 * Delete a job by ID
 */
export function deleteJob(id: string): boolean {
  try {
    const jobs = getJobs();
    const filteredJobs = jobs.filter(job => job.id !== id);

    if (filteredJobs.length === jobs.length) {
      console.error('Job not found:', id);
      return false;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredJobs));

    console.log('Job deleted:', id);
    return true;
  } catch (error) {
    console.error('Error deleting job:', error);
    throw new Error('Failed to delete job');
  }
}

/**
 * Seed initial mock data (useful for testing)
 */
export function seedMockJobs(): void {
  const existingJobs = getJobs();

  if (existingJobs.length > 0) {
    console.log('Jobs already exist, skipping seed');
    return;
  }

  // Note: These IDs should correspond to actual company and recruiter IDs in your system
  // For now, we'll use placeholder IDs that you should replace with real ones
  const mockJobs: JobInput[] = [
    {
      title: 'Senior Full Stack Developer',
      description: `We are looking for a Senior Full Stack Developer to join our innovative team. 

Key Responsibilities:
- Design and develop scalable web applications
- Work with modern frameworks (React, Node.js)
- Collaborate with cross-functional teams
- Mentor junior developers
- Participate in code reviews and architectural decisions

Requirements:
- 5+ years of experience in full-stack development
- Strong proficiency in JavaScript/TypeScript
- Experience with React, Node.js, and PostgreSQL
- Excellent problem-solving skills
- Strong communication and teamwork abilities`,
      location: 'Paris, France',
      job_type: 'Full-time',
      salary_min: 60000,
      salary_max: 85000,
      status: 'active',
      company_id: 'company-1', // Replace with actual company ID
      recruiter_id: 'recruiter-1', // Replace with actual recruiter ID
      skills: [
        { name: 'React', level: 'Expert', mandatory: true },
        { name: 'Node.js', level: 'Advanced', mandatory: true },
        { name: 'TypeScript', level: 'Advanced', mandatory: true },
        { name: 'PostgreSQL', level: 'Intermediate', mandatory: false },
        { name: 'AWS', level: 'Intermediate', mandatory: false },
      ]
    },
    {
      title: 'UI/UX Designer',
      description: `Join our creative team as a UI/UX Designer to craft beautiful and intuitive user experiences.

Key Responsibilities:
- Design user interfaces for web and mobile applications
- Create wireframes, prototypes, and mockups
- Conduct user research and usability testing
- Collaborate with developers and product managers
- Maintain and evolve our design system

Requirements:
- 3+ years of experience in UI/UX design
- Proficiency in Figma, Adobe XD, or Sketch
- Strong portfolio showcasing your work
- Understanding of user-centered design principles
- Excellent visual design skills`,
      location: 'Lyon, France',
      job_type: 'Full-time',
      salary_min: 45000,
      salary_max: 60000,
      status: 'active',
      company_id: 'company-2', // Replace with actual company ID
      recruiter_id: 'recruiter-2', // Replace with actual recruiter ID
      skills: [
        { name: 'Figma', level: 'Expert', mandatory: true },
        { name: 'UI Design', level: 'Advanced', mandatory: true },
        { name: 'UX Research', level: 'Intermediate', mandatory: true },
        { name: 'Prototyping', level: 'Advanced', mandatory: true },
        { name: 'HTML/CSS', level: 'Intermediate', mandatory: false },
      ]
    },
    {
      title: 'Frontend Developer Intern',
      description: `We are offering an exciting internship opportunity for aspiring frontend developers.

What You'll Do:
- Build responsive web interfaces using React
- Learn modern frontend development practices
- Work on real projects with our development team
- Participate in daily stand-ups and sprint planning
- Receive mentorship from senior developers

Requirements:
- Currently pursuing a degree in Computer Science or related field
- Basic knowledge of HTML, CSS, and JavaScript
- Familiarity with React is a plus
- Eager to learn and grow
- Good communication skills`,
      location: 'Marseille, France',
      job_type: 'Internship',
      salary_min: 1200,
      salary_max: 1500,
      status: 'active',
      company_id: 'company-3', // Replace with actual company ID
      recruiter_id: 'recruiter-3', // Replace with actual recruiter ID
      skills: [
        { name: 'React', level: 'Beginner', mandatory: false },
        { name: 'JavaScript', level: 'Intermediate', mandatory: true },
        { name: 'HTML', level: 'Intermediate', mandatory: true },
        { name: 'CSS', level: 'Intermediate', mandatory: true },
        { name: 'Git', level: 'Beginner', mandatory: false },
      ]
    },
    {
      title: 'DevOps Engineer',
      description: `We need a skilled DevOps Engineer to help manage our infrastructure and deployment pipelines.

Key Responsibilities:
- Design and maintain CI/CD pipelines
- Manage cloud infrastructure (AWS/Azure/GCP)
- Implement monitoring and logging solutions
- Automate deployment processes
- Ensure system security and compliance
- Support development teams with infrastructure needs

Requirements:
- 4+ years of DevOps experience
- Strong knowledge of Docker and Kubernetes
- Experience with cloud platforms (AWS preferred)
- Proficiency in scripting (Python, Bash)
- Experience with Infrastructure as Code (Terraform, CloudFormation)
- Strong problem-solving skills`,
      location: 'Remote',
      job_type: 'Full-time',
      salary_min: 55000,
      salary_max: 75000,
      status: 'active',
      company_id: 'company-1', // Replace with actual company ID
      recruiter_id: 'recruiter-1', // Replace with actual recruiter ID
      skills: [
        { name: 'Docker', level: 'Advanced', mandatory: true },
        { name: 'Kubernetes', level: 'Advanced', mandatory: true },
        { name: 'AWS', level: 'Advanced', mandatory: true },
        { name: 'CI/CD', level: 'Advanced', mandatory: true },
        { name: 'Terraform', level: 'Intermediate', mandatory: true },
      ]
    },
    {
      title: 'Product Manager',
      description: `Join our team as a Product Manager to drive the product vision and strategy.

Key Responsibilities:
- Define product roadmap and strategy
- Gather and prioritize product requirements
- Work closely with engineering and design teams
- Conduct market research and competitive analysis
- Define and track key product metrics
- Manage stakeholder relationships

Requirements:
- 3+ years of product management experience
- Strong analytical and strategic thinking skills
- Excellent communication and leadership abilities
- Experience with Agile methodologies
- Technical background is a plus
- Passion for building great products`,
      location: 'Paris, France',
      job_type: 'Full-time',
      salary_min: 50000,
      salary_max: 70000,
      status: 'active',
      company_id: 'company-1', // Replace with actual company ID
      recruiter_id: 'recruiter-1', // Replace with actual recruiter ID
      skills: [
        { name: 'Product Management', level: 'Advanced', mandatory: true },
        { name: 'Agile', level: 'Advanced', mandatory: true },
        { name: 'Data Analysis', level: 'Intermediate', mandatory: true },
        { name: 'Communication', level: 'Expert', mandatory: true },
        { name: 'JIRA', level: 'Intermediate', mandatory: false },
      ]
    },
    {
      title: 'Data Scientist',
      description: `We are seeking a talented Data Scientist to help us leverage data for business insights.

Key Responsibilities:
- Develop and implement machine learning models
- Analyze large datasets to extract meaningful insights
- Create data visualizations and reports
- Collaborate with business stakeholders
- Improve data collection and quality processes
- Stay updated with latest ML/AI trends

Requirements:
- Master's degree in Computer Science, Statistics, or related field
- 3+ years of experience in data science
- Proficiency in Python and ML libraries (scikit-learn, TensorFlow, PyTorch)
- Strong statistical and analytical skills
- Experience with data visualization tools
- Excellent problem-solving abilities`,
      location: 'Lyon, France',
      job_type: 'Full-time',
      salary_min: 55000,
      salary_max: 75000,
      status: 'active',
      company_id: 'company-2', // Replace with actual company ID
      recruiter_id: 'recruiter-2', // Replace with actual recruiter ID
      skills: [
        { name: 'Python', level: 'Expert', mandatory: true },
        { name: 'Machine Learning', level: 'Advanced', mandatory: true },
        { name: 'SQL', level: 'Advanced', mandatory: true },
        { name: 'Data Visualization', level: 'Intermediate', mandatory: true },
        { name: 'TensorFlow', level: 'Intermediate', mandatory: false },
      ]
    },
    {
      title: 'Marketing Specialist',
      description: `We need a creative Marketing Specialist to help grow our brand and reach.

Key Responsibilities:
- Develop and execute marketing campaigns
- Manage social media presence
- Create engaging content for various channels
- Analyze campaign performance and metrics
- Collaborate with design and content teams
- Conduct market research

Requirements:
- 2+ years of marketing experience
- Strong writing and communication skills
- Experience with digital marketing tools
- Knowledge of SEO and content marketing
- Creative thinking and attention to detail
- Data-driven approach to marketing`,
      location: 'Remote',
      job_type: 'Part-time',
      salary_min: 30000,
      salary_max: 40000,
      status: 'active',
      company_id: '581fe904-2355-471c-89d7-843e1fadd298', 
      recruiter_id: 'beaac03a-acad-431b-8efd-526e56c24ad8', 
      skills: [
        { name: 'Digital Marketing', level: 'Intermediate', mandatory: true },
        { name: 'Social Media', level: 'Advanced', mandatory: true },
        { name: 'SEO', level: 'Intermediate', mandatory: true },
        { name: 'Content Writing', level: 'Advanced', mandatory: true },
        { name: 'Google Analytics', level: 'Intermediate', mandatory: false },
      ]
    },
    {
      title: 'Backend Developer (Contract)',
      description: `6-month contract position for an experienced Backend Developer.

Key Responsibilities:
- Build and maintain RESTful APIs
- Design database schemas and optimize queries
- Implement authentication and authorization
- Write unit and integration tests
- Collaborate with frontend developers
- Document technical specifications

Requirements:
- 4+ years of backend development experience
- Strong proficiency in Node.js or Python
- Experience with PostgreSQL or similar databases
- Knowledge of API design best practices
- Familiarity with microservices architecture
- Available for a 6-month contract`,
      location: 'Paris, France',
      job_type: 'Contract',
      salary_min: null,
      salary_max: null,
      status: 'active',
      company_id: '581fe904-2355-471c-89d7-843e1fadd298', 
      recruiter_id: 'beaac03a-acad-431b-8efd-526e56c24ad8',
      skills: [
        { name: 'Node.js', level: 'Advanced', mandatory: true },
        { name: 'API Design', level: 'Advanced', mandatory: true },
        { name: 'PostgreSQL', level: 'Intermediate', mandatory: true },
        { name: 'Microservices', level: 'Intermediate', mandatory: false },
        { name: 'Redis', level: 'Intermediate', mandatory: false },
      ]
    },
    {
      title: 'Mobile Developer (iOS)',
      description: `Looking for an iOS Developer to build amazing mobile experiences.

Key Responsibilities:
- Develop native iOS applications using Swift
- Implement new features and maintain existing ones
- Ensure app performance and quality
- Collaborate with design and backend teams
- Participate in code reviews
- Stay updated with iOS ecosystem

Requirements:
- 3+ years of iOS development experience
- Strong proficiency in Swift and SwiftUI
- Experience with iOS frameworks (UIKit, Core Data, etc.)
- Understanding of Apple's design principles
- Published apps in the App Store
- Passion for mobile development`,
      location: 'Lyon, France',
      job_type: 'Full-time',
      salary_min: 50000,
      salary_max: 70000,
      status: 'draft',
      company_id: '581fe904-2355-471c-89d7-843e1fadd298', 
      recruiter_id: 'beaac03a-acad-431b-8efd-526e56c24ad8',
      skills: [
        { name: 'Swift', level: 'Advanced', mandatory: true },
        { name: 'SwiftUI', level: 'Intermediate', mandatory: true },
        { name: 'iOS SDK', level: 'Advanced', mandatory: true },
        { name: 'Core Data', level: 'Intermediate', mandatory: false },
        { name: 'Git', level: 'Intermediate', mandatory: true },
      ]
    },
    {
      title: 'QA Engineer',
      description: `Join our quality assurance team to ensure our products meet the highest standards.

Key Responsibilities:
- Design and execute test plans and test cases
- Perform manual and automated testing
- Identify, document, and track bugs
- Collaborate with development teams
- Improve testing processes and methodologies
- Participate in release planning

Requirements:
- 2+ years of QA experience
- Experience with automated testing tools (Selenium, Cypress)
- Strong attention to detail
- Good understanding of software development lifecycle
- Excellent analytical and communication skills
- Experience with API testing is a plus`,
      location: 'Marseille, France',
      job_type: 'Full-time',
      salary_min: 40000,
      salary_max: 55000,
      status: 'closed',
      company_id: '581fe904-2355-471c-89d7-843e1fadd298', 
      recruiter_id: 'beaac03a-acad-431b-8efd-526e56c24ad8',
      skills: [
        { name: 'Selenium', level: 'Intermediate', mandatory: true },
        { name: 'Manual Testing', level: 'Advanced', mandatory: true },
        { name: 'JIRA', level: 'Intermediate', mandatory: true },
        { name: 'API Testing', level: 'Intermediate', mandatory: false },
        { name: 'Python', level: 'Beginner', mandatory: false },
      ]
    },
  ];

  mockJobs.forEach(job => addJob(job));
  console.log(`✅ Seeded ${mockJobs.length} mock jobs`);
}

/**
 * Clear all jobs (useful for testing)
 */
export function clearAllJobs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('All jobs cleared');
  } catch (error) {
    console.error('Error clearing jobs:', error);
  }
}
