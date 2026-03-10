import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Política de Privacidade | ResuMatch',
    description: 'Como protegemos e tratamos seus dados pessoais.',
};

export default function PrivacidadeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
