/* 招聘岗位数据 */
export enum Department {
  INTERNSHIPS = 'Internships',
  ENGINEERING = 'Engineering',
  DESIGN = 'Design'
}

export const careers = [
  {
    id: 'intern-software-engineer',
    title: 'Software Engineering Intern',
    department: Department.INTERNSHIPS,
    location: 'San Francisco, CA / Remote',
    type: 'Internship',
    href: '#',
    createdAt: '2025-07-15',
    description: 'Join our engineering team as an intern and work on cutting-edge AI workflow automation tools.'
  },
  {
    id: 'intern-product-design',
    title: 'Product Design Intern',
    department: Department.INTERNSHIPS,
    location: 'San Francisco, CA / Remote',
    type: 'Internship',
    href: '#',
    createdAt: '2025-07-15',
    description: 'Help design the future of AI-driven workflow tools with our design team.'
  },
  {
    id: 'senior-frontend-engineer',
    title: 'Senior Frontend Engineer',
    department: Department.ENGINEERING,
    location: 'San Francisco, CA / Remote',
    type: 'Full-time',
    href: '#',
    createdAt: '2025-07-10',
    description: 'Lead the development of our visual workflow builder and agent management interfaces.'
  },
  {
    id: 'backend-engineer',
    title: 'Backend Engineer',
    department: Department.ENGINEERING,
    location: 'San Francisco, CA / Remote',
    type: 'Full-time',
    href: '#',
    createdAt: '2025-07-12',
    description: 'Build the infrastructure that powers millions of AI agent workflows.'
  },
  {
    id: 'ml-engineer',
    title: 'Machine Learning Engineer',
    department: Department.ENGINEERING,
    location: 'San Francisco, CA / Remote',
    type: 'Full-time',
    href: '#',
    createdAt: '2025-07-08',
    description: 'Develop and optimize the AI models that power our autonomous agents.'
  },
  {
    id: 'senior-product-designer',
    title: 'Senior Product Designer',
    department: Department.DESIGN,
    location: 'San Francisco, CA / Remote',
    type: 'Full-time',
    href: '#',
    createdAt: '2025-07-14',
    description: 'Shape the visual and interaction design of our AI workflow platform.'
  },
  {
    id: 'ux-researcher',
    title: 'UX Researcher',
    department: Department.DESIGN,
    location: 'San Francisco, CA / Remote',
    type: 'Full-time',
    href: '#',
    createdAt: '2025-07-11',
    description: 'Lead user research initiatives to understand how teams build and deploy AI workflows.'
  },
  {
    id: 'design-systems-designer',
    title: 'Design Systems Designer',
    department: Department.DESIGN,
    location: 'San Francisco, CA / Remote',
    type: 'Full-time',
    href: '#',
    createdAt: '2025-07-09',
    description: 'Build and maintain our design system that powers consistent experiences across our platform.'
  }
]
