import { log } from "console";
import { tr } from "framer-motion/client";


const STORAGE_KEY = 'mockCompanies'

export interface Company {
    id: string;
    name: string;
    description: string;
    industry: string;
    size: string;
    location: string;
    website: string;
    logo_url: string;
    created_at: string;
}

// Company data without the ID (for creating new companies)
export interface CompanyInput {
  name: string;
  description: string;
  industry: string;
  size: string;
  location: string;
  website: string;
  logo_url: string;
}

/**
 * Generate a unique ID for a new company
 */

function generateId(): string {
 
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getCompanies () : Company[] {
    if( typeof window === 'undefined'){
        return [];
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if(!stored){
            return[];
        }

        const companies = JSON.parse(stored) as Company[];
        return companies;
    } catch (error){
        console.log('Error Loading companies from localStorage !');
        return [];
    }
} 

/**
 * Generate a unique ID for a new company
 */
export function addCompany(companyData:CompanyInput):Company{
    try {
        const companies = getCompanies()

        const newCompany: Company = {
            id:generateId(),
            ...companyData,
            created_at: new Date().toISOString()
        }
        companies.push(newCompany)

        localStorage.setItem(STORAGE_KEY,JSON.stringify(companies))
        console.log('Company Created',newCompany);
        return newCompany;
    } catch (error) {
        console.error('Error adding company:', error);
        throw new Error('Failed to create company');        
    }
}

/**
 * Seed initial mock data (useful for testing)
 */

export function seedMockCompanies() : void {
    const existingCompanies = getCompanies()

    if(existingCompanies.length > 0){
        console.log('companies already exist , skipping seed');
        return;
    }

    const mockCompanies : CompanyInput[]  = [
         {
      name: 'Tech Innovators',
      description: 'Leading technology company specializing in AI and cloud solutions',
      industry: 'Technology',
      size: '201-500',
      location: 'Paris, France',
      website: 'https://tech-innovators.example.com',
      logo_url: '',
    },
    {
      name: 'Design Studio Pro',
      description: 'Creative design agency for modern brands',
      industry: 'Design',
      size: '11-50',
      location: 'Lyon, France',
      website: 'https://designstudio.example.com',
      logo_url: '',
    },
    {
      name: 'StartupX',
      description: 'Fast-growing startup in the fintech space',
      industry: 'Finance',
      size: '1-10',
      location: 'Marseille, France',
      website: 'https://startupx.example.com',
      logo_url: '',
    },
    ] 
    mockCompanies.forEach(comapany => addCompany(comapany));
    console.log('Mock Company');
    
}

/**
 * Update an existing company
 */
export function updateCompany(id: string, updates: Partial<CompanyInput>): Company | null {
  try {
    const companies = getCompanies();
    const index = companies.findIndex(company => company.id === id);

    if (index === -1) {
      console.error('Company not found:', id);
      return null;
    }

    companies[index] = {
      ...companies[index],
      ...updates,
    };

    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));

    console.log('Company updated:', companies[index]);
    return companies[index];
  } catch (error) {
    console.error('Error updating company:', error);
    throw new Error('Failed to update company');
  }
}

/**
 * Delete a company by ID
 */
export function deleteCompany(id: string): boolean {
  try {
    const companies = getCompanies();
    const filteredCompanies = companies.filter(company => company.id !== id);

    
    if (filteredCompanies.length === companies.length) {
      console.error('Company not found:', id);
      return false;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredCompanies));

    console.log('Company deleted:', id);
    return true;
  } catch (error) {
    console.error('Error deleting company:', error);
    throw new Error('Failed to delete company');
  }
}

/**
 * Clear all companies (useful for testing)
 */
export function clearAllCompanies(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('All companies cleared');
  } catch (error) {
    console.error('Error clearing companies:', error);
  }
}


