[Bismit Panda](https://bismitpanda.com/) [About](https://bismitpanda.com/about) [Blog](https://bismitpanda.com/blog) [Resume](https://bismitpanda.com/resume)  [GitHub](https://github.com/bismitpanda) Search `⌘K`  `Ctrl K`

## Command Palette

Search for a command to run...

[Back to Blog](https://bismitpanda.com/blog)

[Typescript](https://bismitpanda.com/tags/typescript) [Next.js](https://bismitpanda.com/tags/nextjs) [React](https://bismitpanda.com/tags/react) [PDF](https://bismitpanda.com/tags/pdf)• June 3rd, 2025 • 6 min read

# Generate Beautiful Resumes with React PDF and Next.js

![Bismit Panda](https://bismitpanda.com/images/photo.png)

By Bismit Panda

![Generate Beautiful Resumes with React PDF and Next.js](https://bismitpanda.com/_next/image?url=%2Fimages%2Fblogs%2Fgenerate-beautiful-resumes-with-react-pdf-and-nextjs.png&w=3840&q=75)

A dynamic, code-based resume generator that lets you version control your resume and export professional PDFs on demand.

Table of Contents

- [•Prerequisites](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#prerequisites)
- [•The Problem](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#the-problem)
- [•The Setup](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#the-setup)
- [•File Structure](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#file-structure)
- [•Data Structure](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#data-structure)
- [•PDF Generation](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#pdf-generation)
- [•Component Structure](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#component-structure)
- [•Styling](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#styling)
- [•How It Works](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#how-it-works)
- [•What I Learned](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#what-i-learned)
- [•Next Steps](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#next-steps)
- [•Code](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#code)

While building my personal site, I wanted a smarter way to handle resumes, something version-controlled, customizable, and always up-to-date. That's when I decided to build a dynamic resume generator using Next.js and React PDF.

## [Prerequisites](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs\#prerequisites)

Before diving in, you should be familiar with:

- **Next.js** \- Understanding of API routes and the App Router
- **React** \- Basic component composition and props
- **TypeScript** \- Type definitions and interfaces

## [The Problem](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs\#the-problem)

Managing resumes is a pain. You have different versions for different roles, formatting gets messed up when you convert between file types, and keeping everything consistent across updates is tedious. I wanted something that would let me maintain my resume data in a structured format and generate professional PDFs on demand.

Why not Google Docs or Canva?

A resume is a document that showcases your skills and experience. I was not going to spend time on
designing a resume and battling with the formatting.

## [The Setup](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs\#the-setup)

I went with Next.js as I am using that for my profile

- **React PDF** \- For generating PDFs from React components
- **TypeScript** \- For type safety across the data structure

The core idea is simple: define your resume data once in a structured format, then render it as a PDF using React components.

### [File Structure](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs\#file-structure)

- ### app







  - ### resume







    - ### \_components







      - ### sections







        - about-me-section.tsx
        - achievements-section.tsx
        - certifications-section.tsx
        - education-section.tsx
        - experience-section.tsx
        - header-section.tsx
        - projects-section.tsx
        - technologies-section.tsx

      - resume.tsx
      - styles.ts

    - route.tsx

  - globals.css
  - layout.tsx

- ### lib







  - resume-data.ts

- .eslintrc.json
- .gitignore
- next.config.ts
- package.json
- README.md

## [Data Structure](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs\#data-structure)

I started by defining a clear data structure for resume content:

lib/resume-data.ts

```
export interface ResumeData {
  personalInfo: {
    name: string;
    location: string;
    email: string;
    linkedin: string;
    github: string;
    website: string;
  };
  technologies: {
    languages: string;
    softwareAndFrameworks: string;
  };
  aboutMe: string;
  projects: Project[];
  experience: Experience[];
  education: Education[];
  achievements: Achievement[];
  certifications: Certification[];
}
```

I use `content-collections` to manage data and the types and data is fetched from there. Everything stays in sync because it's all referencing the same data source.

## [PDF Generation](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs\#pdf-generation)

The PDF generation happens through a Next.js API route at `/resume`. When you hit this endpoint, it renders a React PDF document and returns the binary data:

app/resume/route.tsx

```
export async function GET() {
  const buffer = await renderToBuffer(<Resume />);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=resume.pdf",
      "Content-Length": buffer.length.toString(),
    },
  });
}
```

Note

You can use `Content-Disposition: "attachment"` to force the browser to download the PDF instead of displaying it in the browser.

app/resume/route.tsx

```
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=resume.pdf",
      "Content-Length": buffer.length.toString(),
    },
  });
```

Note

You can use `route.ts` instead of `route.tsx` and then call the `Resume` component directly as a function like shown below:

app/resume/route.ts

```
export async function GET() {
  const buffer = await renderToBuffer(Resume());
}
```

The `Resume` component is where the core rendering happens. It's a React PDF document that renders each section. The data is fetched from the `resume-data.ts` file.

app/resume/\_components/resume.tsx

```
export function Resume() {
  return (
    <Document title="Bismit Panda's Resume" author="Bismit Panda" subject="Resume">
      <Page size="LETTER" style={styles.page}>
        <HeaderSection data={resumeData.personalInfo} />
        <AboutMeSection content={resumeData.aboutMe} />
        <ProjectsSection projects={resumeData.projects} />
        <ExperienceSection experience={resumeData.experience} />
        <TechnologiesSection technologies={resumeData.technologies} />
        <EducationSection education={resumeData.education} />
        <AchievementsSection achievements={resumeData.achievements} />
        <CertificationsSection certifications={resumeData.certifications} />
      </Page>
    </Document>
  );
}
```

## [Component Structure](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs\#component-structure)

Each section is its own component. Here's how the experience section works:

app/resume/\_components/experience-section.tsx

```
export function ExperienceSection({ experience }: { experience: Experience[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Experience</Text>
      {experience.map((exp, index) => (
        <View key={index} style={styles.entryContainer}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>
              {exp.title}, {exp.company}
            </Text>
            <Text style={styles.entryDate}>
              {formatDate(exp.startDate, "MMM yyyy")} -{" "}
              {exp.endDate ? formatDate(exp.endDate, "MMM yyyy") : "Present"}
            </Text>
          </View>
          <Text style={styles.paragraph}>{exp.description}</Text>
          <View style={styles.highlightsList}>
            {exp.highlights.map((highlight, highlightIndex) => (
              <View key={highlightIndex} style={styles.highlight}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.highlightText}>{highlight.trim()}.</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
```

## [Styling](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs\#styling)

Styling PDFs is different from web styling. It uses plain CSS-in-JS like styles. You define styles using `StyleSheet.create()` and apply them to components.

Here's a snippet of the styles I used:

app/resume/\_components/styles.ts

```
export const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    paddingTop: 25,
    paddingBottom: 25,
    paddingLeft: 30,
    paddingRight: 30,
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
    paddingBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    borderBottomStyle: "solid",
  },
  // ... more styles
});
```

Can I add custom fonts?

Yes, you can add custom fonts. You can import `Font` from `@react-pdf/renderer` and then register your font like so:

app/resume/\_components/styles.ts

```
import { Font } from "@react-pdf/renderer";

const font = Font.register({
  family: "MyFont",
  src: "path/to/my-font.ttf",
});
```

Then you can use the font in your styles like so:

app/resume/\_components/styles.ts

```
import { StyleSheet } from "@react-pdf/renderer";

// Register the font before using it

const styles = StyleSheet.create({
  text: {
    fontFamily: "MyFont",
  },
});
```

## [How It Works](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs\#how-it-works)

Using it is straightforward:

1. Update your resume data in `resume-data.ts`
2. Navigate to `http://localhost:3000/resume`
3. Your browser displays generated PDF (It may download automatically depending on your browser settings)

The PDF generates fresh each time, so any data changes are immediately reflected.

## [What I Learned](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs\#what-i-learned)

The biggest challenge was getting the layout right. React PDF's layout engine is powerful but different from CSS. Spending time understanding how flexbox works in this context saved me a lot of debugging later.

Data structure matters a lot. Having clean, typed interfaces made it easy to add new sections or modify existing ones without breaking anything.

## [Next Steps](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs\#next-steps)

This setup works great for my needs, but there are some obvious extensions which I may add later:

- **Multiple templates** \- Different layouts for different job types
- **Better styling** \- More sophisticated layouts and typography

The foundation is solid though. Having my resume as code means I can iterate quickly, keep everything in version control, and generate consistent PDFs whenever I need them.

## [Code](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs\#code)

View the complete implementation on GitHub:

- [Resume Generator Route](https://github.com/bismitpanda/portfolio-next/tree/main/src/app/resume/route.tsx)
- [Resume Data](https://github.com/bismitpanda/portfolio-next/blob/main/src/lib/resume-data.ts)
- [Resume Components](https://github.com/bismitpanda/portfolio-next/tree/main/src/app/resume/_components)
- [Resume Styles](https://github.com/bismitpanda/portfolio-next/blob/main/src/app/resume/_components/styles.ts)

Or browse the entire repository: [bismitpanda/portfolio-next](https://github.com/bismitpanda/portfolio-next)

On this page

- [•Prerequisites](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#prerequisites)
- [•The Problem](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#the-problem)
- [•The Setup](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#the-setup)
- [•File Structure](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#file-structure)
- [•Data Structure](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#data-structure)
- [•PDF Generation](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#pdf-generation)
- [•Component Structure](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#component-structure)
- [•Styling](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#styling)
- [•How It Works](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#how-it-works)
- [•What I Learned](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#what-i-learned)
- [•Next Steps](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#next-steps)
- [•Code](https://bismitpanda.com/blog/generate-beautiful-resumes-with-react-pdf-and-nextjs#code)

About the author

![Bismit Panda](https://bismitpanda.com/_next/image?url=%2Fimages%2Fphoto.png&w=96&q=75)

### Bismit Panda

Full Stack Developer with a passion for typography and user experience. Writing about web development, design, and the intersection of technology and creativity.

[View Profile](https://bismitpanda.com/about)

## Related Blogs

![Generating Dynamic OpenGraph Images with next/og](https://bismitpanda.com/_next/image?url=%2Fimages%2Fblogs%2Fgenerating-dynamic-opengraph-images-with-nextog.png&w=828&q=75)

[Next.js](https://bismitpanda.com/tags/nextjs) [React](https://bismitpanda.com/tags/react) [TypeScript](https://bismitpanda.com/tags/typescript) [SEO](https://bismitpanda.com/tags/seo)

·Dec 4, 2025

Generating Dynamic OpenGraph Images with next/og

Learn how to create beautiful, dynamic OpenGraph images for your Next.js site using the built-in next/og package, complete with custom fonts, styling, and static generation.

[Read Blog](https://bismitpanda.com/blog/generating-dynamic-opengraph-images-with-nextog)

[Bismit Panda](https://bismitpanda.com/)

Full Stack Developer specializing in creating beautiful, functional websites and applications.

# Quick Links

- [Home](https://bismitpanda.com/)
- [About](https://bismitpanda.com/about)
- [Projects](https://bismitpanda.com/projects)
- [Snippets](https://bismitpanda.com/snippets)
- [Blog](https://bismitpanda.com/blog)
- [Categories](https://bismitpanda.com/categories)
- [Resume](https://bismitpanda.com/resume)
- [VCard](https://bismitpanda.com/vcard)

# Connect

[LinkedIn](https://www.linkedin.com/in/bismit-panda-5432a824a/) [GitHub](https://github.com/bismitpanda) [X](https://x.com/bismitpanda) [Email](mailto:contact@bismitpanda.com) [Phone](tel:+918280016000)

© 2026 Bismit Panda. All rights reserved.