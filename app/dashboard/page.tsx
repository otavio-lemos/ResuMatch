import { redirect } from 'next/navigation';

import { listResumes } from '@/lib/storage/resume-storage';

export default async function DashboardRedirect() {
    const resumesList = (await listResumes()) || [];
    
    if (resumesList.length === 0) {
        redirect('/modelos');
    }

    const resumes = [...resumesList].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const firstResumeId = resumes[0]?.id;
    
    if (firstResumeId) {
        redirect(`/dashboard/${firstResumeId}`);
    }

    redirect('/modelos');
}
