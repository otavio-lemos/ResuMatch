import { listResumes } from '@/lib/storage/resume-storage';
import DashboardContent from '@/components/dashboard/DashboardContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Dashboard - ResuMatch',
    description: 'Manage your resumes and optimize for ATS',
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const resumesList = await listResumes();
    
    console.log('[DASHBOARD SERVER] resumesList length:', resumesList.length);

    const resumes = resumesList
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log('[DASHBOARD SERVER] sorted resumes:', resumes.length, 'first id:', resumes[0]?.id);
    
    return <DashboardContent initialResumes={resumes} />;
}
