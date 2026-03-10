import { listResumes } from '@/lib/storage/resume-storage';
import DashboardContent from '@/components/dashboard/DashboardContent';
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

    return (
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0b1219]">
            <div className="flex-1 w-full mx-auto px-6 xl:px-8 py-6">
                <DashboardContent initialResumes={resumes as any} />
            </div>
        </div>
    );
}
