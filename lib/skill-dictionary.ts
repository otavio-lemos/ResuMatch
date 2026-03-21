/**
 * Canonical Skill Dictionary
 * 
 * Maps common variations of skills to their canonical forms.
 * Focuses on Tech, Design, and Management domains.
 */

export const SKILL_DICTIONARY: Record<string, string> = {
    // ─── Frontend ──────────────────────────────────────────────────────────
    'react': 'Frontend Development',
    'next.js': 'Frontend Development',
    'typescript': 'Frontend Development',
    'javascript': 'Frontend Development',
    'vue': 'Frontend Development',
    'angular': 'Frontend Development',
    'svelte': 'Frontend Development',
    'tailwind': 'Styling',
    'figma': 'UI/UX Design',
    'adobe xd': 'UI/UX Design',
    'sketch': 'UI/UX Design',
    'responsive design': 'UI/UX Design',
    
    // ─── Backend ───────────────────────────────────────────────────────────
    'node.js': 'Backend Development',
    'python': 'Backend/Data Science',
    'java': 'Backend Development',
    'c#': 'Backend Development',
    'go': 'Backend Development',
    'rust': 'Systems Programming',
    'nest.js': 'Backend Framework',
    'express': 'Backend Framework',
    'graphql': 'API Design',
    'rest api': 'API Design',
    
    // ─── AI / Machine Learning ──────────────────────────────────────────────
    'tensorflow': 'Machine Learning',
    'pytorch': 'Machine Learning',
    'scikit-learn': 'Machine Learning',
    'pandas': 'Data Science',
    'numpy': 'Data Science',
    'openai': 'Artificial Intelligence',
    'llm': 'Artificial Intelligence',
    'large language models': 'Artificial Intelligence',
    'langchain': 'AI Orchestration',
    'huggingface': 'Machine Learning',
    'rag': 'Artificial Intelligence',
    'prompt engineering': 'Artificial Intelligence',
    'nlp': 'Natural Language Processing',
    
    // ─── Cloud & DevOps ────────────────────────────────────────────────────
    'aws': 'Cloud Computing',
    'amazon web services': 'Cloud Computing',
    'azure': 'Cloud Computing',
    'gcp': 'Cloud Computing',
    'google cloud': 'Cloud Computing',
    'docker': 'Containerization',
    'kubernetes': 'DevOps',
    'k8s': 'DevOps',
    'terraform': 'Infrastructure as Code',
    'ansible': 'Automation',
    'jenkins': 'CI/CD',
    'github actions': 'CI/CD',
    'argocd': 'GitOps',
    
    // ─── Databases ─────────────────────────────────────────────────────────
    'postgresql': 'Database',
    'postgres': 'Database',
    'mongodb': 'Database',
    'mysql': 'Database',
    'dynamodb': 'NoSQL Database',
    'redis': 'Caching',
    'elasticsearch': 'Search Engine',
    
    // ─── Security ──────────────────────────────────────────────────────────
    'cybersecurity': 'Security',
    'pentesting': 'Security',
    'owasp': 'Security',
    'soc2': 'Security Compliance',
    'iso27001': 'Security Compliance',
    
    // ─── Management & Business ─────────────────────────────────────────────
    'agile': 'Project Management',
    'scrum': 'Project Management',
    'kanban': 'Project Management',
    'pmp': 'Project Management',
    'product management': 'Management',
    'stakeholder management': 'Management',
    'team leadership': 'Leadership',
    
    // ─── Mobile ────────────────────────────────────────────────────────────
    'react native': 'Mobile Development',
    'flutter': 'Mobile Development',
    'swiftui': 'iOS Development',
    'kotlin': 'Android Development',
};
