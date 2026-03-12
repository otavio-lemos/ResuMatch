import { listResumes } from '@/lib/storage/resume-storage';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Dashboard - ResuMatch',
    description: 'Manage your resumes and optimize for ATS',
};

export const dynamic = 'force-dynamic';

export default async function Home() {
    const resumesList = await listResumes();

    if (resumesList.length === 0) {
        redirect('/modelos');
    }

    const resumes = resumesList.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const firstResumeId = resumes[0]?.id;
    
    if (firstResumeId) {
        redirect(`/dashboard/${firstResumeId}`);
    }

    redirect('/modelos');
}
