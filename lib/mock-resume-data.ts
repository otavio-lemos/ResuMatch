import { ResumeData } from "@/store/useResumeStore";

export function getMockDataForTemplate(templateId: string): Partial<ResumeData> {
  const baseData = {
    personalInfo: {
      fullName: "Alex Silva",
      title: "Senior Software Engineer",
      email: "alex.silva@example.com",
      phone: "+55 11 99999-9999",
      location: "São Paulo, SP",
      linkedin: "linkedin.com/in/alexsilva",
      portfolio: "github.com/alexsilva",
    },
    summary: "Engenheiro de Software Sênior com mais de 8 anos de experiência no desenvolvimento de aplicações web escaláveis e de alta performance. Especialista no ecossistema JavaScript/TypeScript, com forte foco em React, Next.js e Node.js. Histórico comprovado de liderança técnica em equipes ágeis, melhoria de métricas de performance (Core Web Vitals) e implementação de arquiteturas resilientes em nuvem (AWS/GCP).",
    experiences: [
      {
        id: "exp-1",
        position: "Tech Lead",
        company: "TechNova Solutions",
        location: "São Paulo, SP",
        startDate: "03/2021",
        endDate: "Present",
        current: true,
        description: "- Liderou equipe de 6 desenvolvedores na refatoração do principal produto SaaS da empresa, migrando de Vue.js para Next.js 14.\n- Reduziu o tempo de carregamento da página em 40% e aumentou a taxa de conversão em 15% após otimizações de Core Web Vitals.\n- Arquitetou e implementou pipeline de CI/CD no GitHub Actions, reduzindo o tempo de deploy de 45 minutos para 12 minutos.\n- Mentorou desenvolvedores júniores e conduziu code reviews semanais focados em boas práticas e segurança."
      },
      {
        id: "exp-2",
        position: "Desenvolvedor Front-end Sênior",
        company: "Innovate Digital",
        location: "Remoto",
        startDate: "06/2018",
        endDate: "02/2021",
        current: false,
        description: "- Desenvolveu a interface completa do novo portal de e-commerce utilizando React, Redux e Styled Components, faturando mais de R$ 2M no primeiro trimestre.\n- Integrou APIs RESTful complexas e sistemas de pagamento (Stripe, PayPal) com foco em resiliência e tratamento de erros.\n- Criou biblioteca interna de componentes UI padronizados, adotada por 3 times diferentes, economizando cerca de 20% do tempo de desenvolvimento de novas features."
      }
    ],
    education: [
      {
        id: "edu-1",
        degree: "Bacharelado em Ciência da Computação",
        institution: "Universidade de São Paulo (USP)",
        location: "São Paulo, SP",
        startDate: "02/2013",
        endDate: "12/2017",
        current: false,
        description: "Bolsista de iniciação científica em Inteligência Artificial. Trabalho de Conclusão de Curso: \"Otimização de Algoritmos de Busca em Grafos Complexos\" aprovado com nota máxima."
      }
    ],
    skills: [
      {
        id: "skill-1",
        category: "Linguagens & Frameworks",
        skills: ["JavaScript (ES6+)", "TypeScript", "React.js", "Next.js", "Node.js", "Express", "Python"]
      },
      {
        id: "skill-2",
        category: "Infra & Ferramentas",
        skills: ["Git/GitHub", "Docker", "AWS (S3, EC2, Lambda)", "PostgreSQL", "MongoDB", "Redis", "Jest", "Cypress"]
      }
    ]
  };

  return baseData;
}
