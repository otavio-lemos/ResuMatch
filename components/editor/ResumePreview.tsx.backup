'use client';

// export const metadata = {}; // SEO bypass
import { Mail, Phone, MapPin, Link as LinkIcon } from 'lucide-react';
import { useResumeStore } from '@/store/useResumeStore';
import { ResumeData, AppearanceSettings, PersonalInfo } from '@/store/useResumeStore';
import { useTranslation } from '@/hooks/useTranslation';

const LABELS = { pt: 'Atual', en: 'Current' };

function getCurrentLabel(lang: string = 'pt'): string {
    return LABELS[lang as keyof typeof LABELS] || LABELS.pt;
}

// ─── ATS UTILITIES ──────────────────────────────────────────────────────────────
export function stripEmojis(text: any): string {
    if (!text) return '';
    const str = String(text);
    // 1. Regex to remove emojis and extended pictographics
    let cleaned = str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
    
    // 2. Normalize Smart Quotes to Straight Quotes
    cleaned = cleaned.replace(/[“”]/g, '"');
    cleaned = cleaned.replace(/[‘’]/g, "'");
    
    // 3. Normalize Em-dashes and En-dashes to simple hyphens
    cleaned = cleaned.replace(/[—–]/g, '-');
    
    return cleaned;
}

export function normalizeAtsDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    // Remove extra spaces
    let str = dateStr.trim();
    if (!str) return '';

    // If it's just a year (YYYY), leave it
    if (/^\d{4}$/.test(str)) return str;

    // Handle existing MM/YYYY or MM-YYYY
    const mmYyyyMatch = str.match(/(\d{1,2})[\/\-\.](\d{4})/);
    if (mmYyyyMatch) {
        const month = mmYyyyMatch[1].padStart(2, '0');
        const year = mmYyyyMatch[2];
        return `${month}/${year}`;
    }

    // Handle spelled out months (pt/en)
    const monthMap: Record<string, string> = {
        'jan': '01', 'january': '01', 'janeiro': '01',
        'feb': '02', 'february': '02', 'fev': '02', 'fevereiro': '02',
        'mar': '03', 'march': '03', 'março': '03',
        'apr': '04', 'april': '04', 'abr': '04', 'abril': '04',
        'may': '05', 'mai': '05', 'maio': '05',
        'jun': '06', 'june': '06', 'junho': '06',
        'jul': '07', 'july': '07', 'julho': '07',
        'aug': '08', 'august': '08', 'ago': '08', 'agosto': '08',
        'sep': '09', 'september': '09', 'set': '09', 'setembro': '09',
        'oct': '10', 'october': '10', 'out': '10', 'outubro': '10',
        'nov': '11', 'november': '11', 'novembro': '11',
        'dec': '12', 'december': '12', 'dez': '12', 'dezembro': '12'
    };

    const monthWordMatch = str.toLowerCase().match(/([a-zç]+)[\s,]+(\d{4})/);
    if (monthWordMatch) {
        const word = monthWordMatch[1];
        const year = monthWordMatch[2];
        
        // Try to match the word
        for (const [key, num] of Object.entries(monthMap)) {
            if (word.startsWith(key)) {
                return `${num}/${year}`;
            }
        }
    }

    // Return original if no match (to avoid destroying unknown valid text like 'Present')
    return str;
}


// ─── ATS-SAFE FONT MAP ─────────────────────────────────────────────────────────
const FONT_MAP: Record<string, string> = {
    'Inter': "'Inter', Arial, sans-serif",
    'Arial': "Arial, sans-serif",
    'Calibri': "'Calibri', 'Gill Sans', sans-serif",
    'Georgia': "Georgia, 'Times New Roman', serif",
    'Times New Roman': "'Times New Roman', Times, serif",
    'Roboto': "'Roboto', Arial, sans-serif",
};

const PAGE_SIZES = {
    'A4': { width: '210mm', minHeight: '297mm' },
    'LETTER': { width: '215.9mm', minHeight: '279.4mm' },
    'LEGAL': { width: '215.9mm', minHeight: '355.6mm' },
    'EXECUTIVE': { width: '184.1mm', minHeight: '266.7mm' },
};

function getStyles(appearance: AppearanceSettings): React.CSSProperties {
    const size = PAGE_SIZES[appearance.pageSize] || PAGE_SIZES['A4'];
    return {
        fontFamily: FONT_MAP[appearance.fontFamily] || FONT_MAP['Inter'],
        fontSize: `${appearance.fontSize}pt`,
        lineHeight: appearance.lineSpacing,
        width: size.width,
        minHeight: size.minHeight,
    };
}

// ─── HELPER: Photo Component ──────────────────────────────────────────────────
function ResumePhoto({ url, size = '80px' }: { url?: string, size?: string }) {
    if (!url) return null;
    return (
        <div style={{
            flexShrink: 0,
            width: size,
            height: size,
            borderRadius: '0px',
            overflow: 'hidden',
            border: '2px solid #e2e8f0',
            marginBottom: '10px'
        }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
    );
}

// ─── HELPER: Disclaimer Component ─────────────────────────────────────────────
function PrintDisclaimer({ t }: { t: (key: string) => string }) {
    return (
        <div className="no-print mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs text-center max-w-[210mm] mx-auto">
            <p className="font-semibold mb-1">
                {t('editor.printDisclaimer')}
            </p>
        </div>
    );
}

// ─── TEMPLATE 1: Classic Executive ─────────────────────────────────────────────
function TemplateClassic({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    return (
        <div className="resume-container" style={{ ...style, background: 'white', color: '#1e293b', padding: '15mm', boxSizing: 'border-box' }}>
            <header style={{ borderBottom: '2px solid #1e293b', paddingBottom: '5mm', marginBottom: '5mm', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <ResumePhoto url={personalInfo.photoUrl} size="90px" />
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '2em', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#0f172a', marginBottom: '4px' }}>
                        {stripEmojis(personalInfo.fullName) || 'SEU NOME'}
                    </h2>
                    <p style={{ fontSize: '1.1em', fontWeight: 500, color: '#475569', textTransform: 'uppercase', marginBottom: '12px' }}>
                        {stripEmojis(personalInfo.title) || 'SEU CARGO'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.78em', color: '#64748b' }}>
                        {[
                            personalInfo.email,
                            personalInfo.phone ? `• ${personalInfo.phone}` : '',
                            personalInfo.location ? `• ${personalInfo.location}` : '',
                            personalInfo.linkedin ? `• ${personalInfo.linkedin}` : '',
                            personalInfo.github ? `• ${personalInfo.github}` : '',
                            personalInfo.portfolio ? `• ${personalInfo.portfolio}` : ''
                        ].filter(Boolean).map((item, idx) => (
                            <span key={idx}>{stripEmojis(item)}</span>
                        ))}
                    </div>
                </div>
            </header>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                if (section.id === 'summary' && summary) {
                    return (
                        <section key={section.id} style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '0.7em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '10px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            <p style={{ fontSize: '0.9em', color: '#374151', textAlign: 'justify', whiteSpace: 'pre-line' }}>{stripEmojis(summary)}</p>
                        </section>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '0.7em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '12px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <strong style={{ color: '#0f172a' }}>{stripEmojis(exp.position)}</strong>
                                        <span style={{ fontSize: '0.78em', color: '#64748b', fontWeight: 600 }}>
                                            {normalizeAtsDate(exp.startDate)} — {exp.current ? getCurrentLabel('pt') : exp.endDate}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.85em', color: '#475569', fontStyle: 'italic', marginBottom: '4px' }}>
                                        {stripEmojis(exp.company)}{exp.location && `, ${stripEmojis(exp.location)}`}
                                    </p>
                                    <p style={{ fontSize: '0.88em', color: '#374151', whiteSpace: 'pre-line' }}>{stripEmojis(exp.description)}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '0.7em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '12px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <strong style={{ color: '#0f172a' }}>{stripEmojis(edu.degree)}</strong>
                                        <span style={{ fontSize: '0.78em', color: '#64748b' }}>{normalizeAtsDate(edu.startDate)}{edu.endDate && ` — ${normalizeAtsDate(edu.endDate)}`}</span>
                                    </div>
                                    <p style={{ fontSize: '0.85em', color: '#475569' }}>{stripEmojis(edu.institution)}{edu.location && `, ${stripEmojis(edu.location)}`}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '0.7em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '10px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', fontSize: '0.88em', color: '#374151' }}>
                                {skills.map(g => (
                                    <div key={g.id}><strong style={{ color: '#0f172a' }}>{stripEmojis(g.category)}:</strong> {stripEmojis(g.skills.join(', '))}</div>
                                ))}
                            </div>
                        </section>
                    );
                }

                // Render Custom Sections
                if (section.type === 'TEXT') {
                    return (
                        <section key={section.id} style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '0.7em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '10px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            <p style={{ fontSize: '0.9em', color: '#374151', whiteSpace: 'pre-line' }}>{stripEmojis(section.content)}</p>
                        </section>
                    );
                }

                if (section.type === 'SIMPLE_LIST') {
                    return (
                        <section key={section.id} style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '0.7em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '10px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            <ul style={{ fontSize: '0.9em', color: '#374151', paddingLeft: '18px', listStyleType: 'disc' }}>
                                {(section.items as any[] || []).map((item, idx) => (
                                    <li key={idx} style={{ marginBottom: '4px' }}>
                                        {section.id === 'certifications' && item && typeof item === 'object' ? (
                                            <span><strong>{stripEmojis(item.name || item.title || 'Certificação')}</strong>{item.issuer && <span> — {stripEmojis(item.issuer)}</span>}{item.date && <span> ({normalizeAtsDate(item.date)})</span>}</span>
                                        ) : typeof item === 'object' && item !== null ? (
                                            <span><strong>{stripEmojis(item.name || item.title || '')}</strong>{item.description && <span> — {stripEmojis(item.description)}</span>}</span>
                                        ) : stripEmojis(String(item))}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                }

                if (section.type === 'DATED_LIST') {
                    return (
                        <section key={section.id} style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '0.7em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '12px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            {(section.items as any[] || []).map(item => (
                                <div key={item.id} style={{ marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <strong style={{ color: '#0f172a' }}>{stripEmojis(item.title)}</strong>
                                        <span style={{ fontSize: '0.78em', color: '#64748b', fontWeight: 600 }}>
                                            {normalizeAtsDate(item.startDate)}{item.endDate && ` — ${normalizeAtsDate(item.endDate)}`}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.85em', color: '#475569', fontStyle: 'italic', marginBottom: '4px' }}>
                                        {stripEmojis(item.subtitle)}{item.location && `, ${stripEmojis(item.location)}`}
                                    </p>
                                    <p style={{ fontSize: '0.88em', color: '#374151', whiteSpace: 'pre-line' }}>{stripEmojis(item.description)}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                return null;
            })}
        </div>
    );
}

// ─── TEMPLATE 2: Modern Two-Column ─────────────────────────────────────────────
function TemplateModern({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    return (
        <div className="resume-container" style={{ ...style, background: 'white', display: 'flex', boxSizing: 'border-box' }}>
            {/* Left Sidebar - Adjusted for 210mm total width */}
            <div style={{ width: '55mm', background: '#1e293b', color: 'white', padding: '15mm 15mm', flexShrink: 0 }}>
                <ResumePhoto url={personalInfo.photoUrl} size="120px" />

                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.2em', fontWeight: 700, color: 'white', lineHeight: 1.2, marginBottom: '6px' }}>
                        {personalInfo.fullName || 'SEU NOME'}
                    </h2>
                    <p style={{ fontSize: '0.75em', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {personalInfo.title || ''}
                    </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '0.6em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#60a5fa', marginBottom: '8px' }}>{data.language === 'en' ? 'Contact' : 'Contato'}</h3>
                    {[
                        { label: personalInfo.email },
                        { label: personalInfo.phone },
                        { label: personalInfo.location },
                        { label: personalInfo.linkedin },
                        { label: personalInfo.github },
                        { label: personalInfo.portfolio },
                    ].filter(i => i.label).map((item, idx) => (
                        <p key={idx} style={{ fontSize: '0.75em', color: '#cbd5e1', marginBottom: '4px', wordBreak: 'break-all' }}>{item.label}</p>
                    ))}
                </div>

                {skills.length > 0 && (
                    <div>
                        <h3 style={{ fontSize: '0.6em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#60a5fa', marginBottom: '8px' }}>{data.language === 'en' ? 'Skills' : 'Competências'}</h3>
                        {skills.map(g => (
                            <div key={g.id} style={{ marginBottom: '10px' }}>
                                <p style={{ fontSize: '0.7em', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>{g.category}</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                    {g.skills.map(s => (
                                        <span key={s} style={{ fontSize: '0.65em', background: '#334155', color: '#94a3b8', padding: '1px 6px', borderRadius: '3px' }}>{s}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Main Content */}
            <div style={{ flex: 1, padding: '15mm', overflow: 'hidden' }}>
                {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                    const sectionStyle = { marginBottom: '20px' };
                    const headingStyle = { fontSize: '0.7em', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#1e40af', borderBottom: '2px solid #1e40af', paddingBottom: '4px', marginBottom: '12px' };

                    if (section.id === 'summary' && summary) {
                        return (
                            <section key={section.id} style={sectionStyle}>
                                <h2 style={headingStyle}>{section.title}</h2>
                                <p style={{ fontSize: '0.88em', color: '#374151', textAlign: 'justify', whiteSpace: 'pre-line' }}>{summary}</p>
                            </section>
                        );
                    }

                    if (section.id === 'experience' && experiences.length > 0) {
                        return (
                            <section key={section.id} style={sectionStyle}>
                                <h2 style={headingStyle}>{section.title}</h2>
                                {experiences.map(exp => (
                                    <div key={exp.id} style={{ marginBottom: '14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <strong style={{ color: '#0f172a', fontSize: '0.95em' }}>{exp.position}</strong>
                                            <span style={{ fontSize: '0.75em', color: '#64748b' }}>                                            {normalizeAtsDate(exp.startDate)} — {exp.current ? getCurrentLabel('pt') : exp.endDate}</span>
                                        </div>
                                        <p style={{ fontSize: '0.82em', color: '#1e40af', marginBottom: '4px' }}>{exp.company}{exp.location && `, ${exp.location}`}</p>
                                        <p style={{ fontSize: '0.85em', color: '#374151', whiteSpace: 'pre-line' }}>{exp.description}</p>
                                    </div>
                                ))}
                            </section>
                        );
                    }

                    if (section.id === 'education' && education.length > 0) {
                        return (
                            <section key={section.id} style={sectionStyle}>
                                <h2 style={headingStyle}>{section.title}</h2>
                                {education.map(edu => (
                                    <div key={edu.id} style={{ marginBottom: '10px' }}>
                                        <strong style={{ fontSize: '0.9em', color: '#0f172a' }}>{edu.degree}</strong>
                                        <p style={{ fontSize: '0.82em', color: '#374151' }}>{edu.institution}{edu.location && `, ${edu.location}`}</p>
                                        <p style={{ fontSize: '0.75em', color: '#64748b' }}>{normalizeAtsDate(edu.startDate)}{edu.endDate && ` — ${normalizeAtsDate(edu.endDate)}`}</p>
                                    </div>
                                ))}
                            </section>
                        );
                    }

                    if (section.id === 'skills' && skills.length > 0) {
                        return (
                            <section key={section.id} style={sectionStyle}>
                                <h2 style={headingStyle}>{section.title}</h2>
                                {skills.map(g => (
                                    <div key={g.id} style={{ marginBottom: '10px' }}>
                                        <p style={{ fontSize: '0.75em', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{g.category}</p>
                                        <p style={{ fontSize: '0.82em', color: '#374151' }}>{g.skills.join(', ')}</p>
                                    </div>
                                ))}
                            </section>
                        );
                    }

                    if (section.type === 'TEXT') {
                        return (
                            <section key={section.id} style={sectionStyle}>
                                <h2 style={headingStyle}>{section.title}</h2>
                                <p style={{ fontSize: '0.88em', color: '#374151', whiteSpace: 'pre-line' }}>{section.content}</p>
                            </section>
                        );
                    }

                    if (section.type === 'SIMPLE_LIST') {
                        const isCertSection = section.id === 'certifications';
                        return (
                            <section key={section.id} style={sectionStyle}>
                                <h2 style={headingStyle}>{section.title}</h2>
                                <ul style={{ fontSize: '0.85em', color: '#374151', paddingLeft: '16px', listStyleType: 'square' }}>
                                    {(section.items as any[] || []).map((item, idx) => (
                                        <li key={idx} style={{ marginBottom: '3px' }}>
                                            {isCertSection && item && typeof item === 'object' ? (
                                                <span><strong>{item.name || item.title || 'Certificação'}</strong>{item.issuer && <span> — {item.issuer}</span>}{item.date && <span> ({normalizeAtsDate(item.date)})</span>}</span>
                                            ) : typeof item === 'object' && item !== null ? (
                                                <span><strong>{item.name || item.title || ''}</strong>{item.description && <span> — {item.description}</span>}</span>
                                            ) : String(item)}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        );
                    }

                    if (section.type === 'DATED_LIST') {
                        return (
                            <section key={section.id} style={sectionStyle}>
                                <h2 style={headingStyle}>{section.title}</h2>
                                {(section.items as any[] || []).map(item => (
                                    <div key={item.id} style={{ marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <strong style={{ color: '#0f172a', fontSize: '0.9em' }}>{item.title}</strong>
                                            <span style={{ fontSize: '0.7em', color: '#64748b' }}>{normalizeAtsDate(item.startDate)}{item.endDate && ` — ${normalizeAtsDate(item.endDate)}`}</span>
                                        </div>
                                        <p style={{ fontSize: '0.8em', color: '#1e40af' }}>{item.subtitle}{item.location && `, ${item.location}`}</p>
                                        <p style={{ fontSize: '0.82em', color: '#374151', whiteSpace: 'pre-line' }}>{item.description}</p>
                                    </div>
                                ))}
                            </section>
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
}

// ─── TEMPLATE 3: Vienna (With Photo) ──────────────────────────────────────────
function TemplateVienna({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    return (
        <div className="resume-container" style={{ ...style, background: 'white', color: '#111827', padding: '15mm', boxSizing: 'border-box' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '2px solid #3b82f6', paddingBottom: '5mm', marginBottom: '5mm' }}>
                <ResumePhoto url={personalInfo.photoUrl} size="100px" />
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '2.4em', fontWeight: 800, color: '#1e3a8a', letterSpacing: '-0.02em', marginBottom: '4px', lineHeight: 1.1 }}>
                        {stripEmojis(personalInfo.fullName) || 'SEU NOME'}
                    </h2>
                    <p style={{ fontSize: '1.1em', color: '#3b82f6', fontWeight: 600, paddingBottom: '8px', marginBottom: '8px' }}>
                        {stripEmojis(personalInfo.title) || 'Seu Cargo Desejado'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: '4px', columnGap: '16px', fontSize: '0.85em', color: '#475569' }}>
                        {personalInfo.location && <span>• {stripEmojis(personalInfo.location)}</span>}
                        {personalInfo.email && <span>• {stripEmojis(personalInfo.email)}</span>}
                        {personalInfo.phone && <span>• {stripEmojis(personalInfo.phone)}</span>}
                        {personalInfo.linkedin && <span>• {stripEmojis(personalInfo.linkedin)}</span>}
                        {personalInfo.github && <span>• {stripEmojis(personalInfo.github)}</span>}
                        {personalInfo.portfolio && <span>• {stripEmojis(personalInfo.portfolio)}</span>}
                    </div>
                </div>
            </header>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                const sectionStyle = { marginBottom: '24px' };
                const headingStyle = { fontSize: '0.9em', fontWeight: 700, textTransform: 'uppercase' as const, color: '#1e3a8a', borderBottom: '1px solid #bfdbfe', paddingBottom: '4px', marginBottom: '12px', letterSpacing: '0.05em' };

                if (section.id === 'summary' && summary) {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{stripEmojis(section.title)}</h2>
                            <p style={{ fontSize: '0.95em', textAlign: 'justify', lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-line' }}>{stripEmojis(summary)}</p>
                        </section>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{stripEmojis(section.title)}</h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '18px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <h3 style={{ fontSize: '1.05em', fontWeight: 700, color: '#0f172a', margin: 0 }}>{stripEmojis(exp.position)}</h3>
                                        <span style={{ fontSize: '0.85em', color: '#3b82f6', fontWeight: 600 }}>{normalizeAtsDate(exp.startDate)} – {exp.current ? 'Present' : exp.endDate}</span>
                                    </div>
                                    <div style={{ fontSize: '0.95em', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                                        {stripEmojis(exp.company)}{exp.location && ` | ${stripEmojis(exp.location)}`}
                                    </div>
                                    <p style={{ fontSize: '0.9em', color: '#334155', whiteSpace: 'pre-line', lineHeight: 1.5, margin: 0 }}>{stripEmojis(exp.description)}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{stripEmojis(section.title)}</h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <h3 style={{ fontSize: '1em', fontWeight: 700, color: '#0f172a', margin: 0 }}>{stripEmojis(edu.degree)}</h3>
                                        <span style={{ fontSize: '0.85em', color: '#64748b' }}>{normalizeAtsDate(edu.startDate)} – {normalizeAtsDate(edu.endDate)}</span>
                                    </div>
                                    <div style={{ fontSize: '0.95em', color: '#475569' }}>
                                        {stripEmojis(edu.institution)}{edu.location && ` | ${stripEmojis(edu.location)}`}
                                    </div>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{stripEmojis(section.title)}</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 24px' }}>
                                {skills.map(g => (
                                    <div key={g.id} style={{ fontSize: '0.9em', color: '#334155' }}>
                                        <strong style={{ color: '#0f172a' }}>{stripEmojis(g.category)}:</strong> {stripEmojis(g.skills.join(', '))}
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                }

                if (section.type === 'TEXT') {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{stripEmojis(section.title)}</h2>
                            <p style={{ fontSize: '0.9em', whiteSpace: 'pre-line', color: '#334155', lineHeight: 1.6, margin: 0 }}>{stripEmojis(section.content)}</p>
                        </section>
                    );
                }

                if (section.type === 'SIMPLE_LIST') {
                    const isCertSection = section.id === 'certifications';
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{stripEmojis(section.title)}</h2>
                            <ul style={{ fontSize: '0.9em', color: '#334155', paddingLeft: '20px', listStyleType: 'square', margin: 0 }}>
                                {(section.items as any[] || []).map((item, idx) => (
                                    <li key={idx} style={{ marginBottom: '6px' }}>
                                        {isCertSection && item && typeof item === 'object' ? (
                                            <span><strong>{stripEmojis(item.name || item.title || 'Certificação')}</strong>{item.issuer && <span> — {stripEmojis(item.issuer)}</span>}{item.date && <span> ({normalizeAtsDate(item.date)})</span>}</span>
                                        ) : typeof item === 'object' && item !== null ? (
                                            <span><strong>{stripEmojis(item.name || item.title || '')}</strong>{item.description && <span> — {stripEmojis(item.description)}</span>}</span>
                                        ) : stripEmojis(String(item))}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                }

                if (section.type === 'DATED_LIST') {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{stripEmojis(section.title)}</h2>
                            {(section.items as any[] || []).map(item => (
                                <div key={item.id} style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <h3 style={{ fontSize: '1em', fontWeight: 700, color: '#0f172a', margin: 0 }}>{stripEmojis(item.title)}</h3>
                                        <span style={{ fontSize: '0.85em', color: '#64748b' }}>{normalizeAtsDate(item.startDate)} – {normalizeAtsDate(item.endDate)}</span>
                                    </div>
                                    {item.subtitle && <div style={{ fontSize: '0.95em', color: '#475569', marginBottom: '4px' }}>{stripEmojis(item.subtitle)}{item.location && ` | ${stripEmojis(item.location)}`}</div>}
                                    <p style={{ fontSize: '0.9em', whiteSpace: 'pre-line', color: '#334155', lineHeight: 1.5, margin: 0 }}>{stripEmojis(item.description)}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                return null;
            })}
        </div>
    );
}
// ─── TEMPLATE 3: Minimalist Clean ──────────────────────────────────────────────
function TemplateMinimalist({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    return (
        <div className="resume-container" style={{ ...style, background: 'white', color: '#111827', padding: '15mm', boxSizing: 'border-box' }}>
            {/* Centered header */}
            <header style={{ textAlign: 'center', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #d1d5db' }}>
                <ResumePhoto url={personalInfo.photoUrl} size="100px" />
                <h2 style={{ fontSize: '2.2em', fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#111827', marginBottom: '4px' }}>
                    {personalInfo.fullName || 'SEU NOME'}
                </h2>
                {personalInfo.title && (
                    <p style={{ fontSize: '0.9em', color: '#6b7280', letterSpacing: '0.1em', marginBottom: '10px' }}>{personalInfo.title}</p>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.75em', color: '#6b7280' }}>
                    {personalInfo.email && <span>{personalInfo.email}</span>}
                    {personalInfo.phone && <span>|</span>}
                    {personalInfo.phone && <span>{personalInfo.phone}</span>}
                    {personalInfo.location && <span>|</span>}
                    {personalInfo.location && <span>{personalInfo.location}</span>}
                    {personalInfo.linkedin && <span>|</span>}
                    {personalInfo.linkedin && <span>{personalInfo.linkedin}</span>}
                    {personalInfo.github && <span>|</span>}
                    {personalInfo.github && <span>{personalInfo.github}</span>}
                </div>
            </header>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                const sectionStyle = { marginBottom: '18px' };
                const headingStyle = { fontSize: '0.65em', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: '#6b7280', marginBottom: '10px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' };

                if (section.id === 'summary' && summary) {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={{ ...headingStyle, borderTop: 'none', paddingTop: 0, marginBottom: '6px' }}>{section.title}</h2>
                            <p style={{ fontSize: '0.9em', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{summary}</p>
                        </section>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '14px', paddingLeft: '12px', borderLeft: '2px solid #e5e7eb' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: '0.9em' }}>{exp.position} — {exp.company}</strong>
                                        <span style={{ fontSize: '0.75em', color: '#9ca3af' }}>{normalizeAtsDate(exp.startDate)} – {exp.current ? currentLabel : exp.endDate}</span>
                                    </div>
                                    <p style={{ fontSize: '0.82em', color: '#6b7280', marginBottom: '3px' }}>{exp.location}</p>
                                    <p style={{ fontSize: '0.85em', color: '#374151', whiteSpace: 'pre-line' }}>{exp.description}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: '0.88em' }}>{edu.degree}</strong>
                                        <span style={{ fontSize: '0.75em', color: '#9ca3af' }}>{normalizeAtsDate(edu.startDate)}{edu.endDate && ` — ${normalizeAtsDate(edu.endDate)}`}</span>
                                    </div>
                                    <p style={{ fontSize: '0.8em', color: '#6b7280' }}>{edu.institution}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {skills.map(g => (
                                    <div key={g.id}>
                                        <p style={{ fontSize: '0.8em', fontWeight: 600, color: '#374151' }}>{g.category}</p>
                                        <p style={{ fontSize: '0.78em', color: '#6b7280' }}>{g.skills.join(' · ')}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                }

                if (section.type === 'TEXT') {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            <p style={{ fontSize: '0.9em', color: '#374151', lineHeight: 1.7 }}>{section.content}</p>
                        </section>
                    );
                }

                if (section.type === 'SIMPLE_LIST') {
                    const isCertSection = section.id === 'certifications';
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            <ul style={{ fontSize: '0.88em', color: '#374151', paddingLeft: '14px', listStyleType: 'circle' }}>
                                {(section.items as any[] || []).map((item, idx) => (
                                    <li key={idx} style={{ marginBottom: '4px' }}>
                                        {isCertSection && item && typeof item === 'object' ? (
                                            <span><strong>{item.name || item.title || 'Certificação'}</strong>{item.issuer && <span> — {item.issuer}</span>}{item.date && <span> ({normalizeAtsDate(item.date)})</span>}</span>
                                        ) : typeof item === 'object' && item !== null ? (
                                            <span><strong>{item.name || item.title || ''}</strong>{item.description && <span> — {item.description}</span>}</span>
                                        ) : String(item)}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                }

                if (section.type === 'DATED_LIST') {
                    return (
                        <section key={section.id} style={sectionStyle}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {(section.items as any[] || []).map(item => (
                                <div key={item.id} style={{ marginBottom: '12px', paddingLeft: '12px', borderLeft: '2px solid #f3f4f6' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: '0.88em' }}>{item.title}</strong>
                                        <span style={{ fontSize: '0.7em', color: '#9ca3af' }}>{normalizeAtsDate(item.startDate)}{item.endDate && ` – ${normalizeAtsDate(item.endDate)}`}</span>
                                    </div>
                                    <p style={{ fontSize: '0.8em', color: '#6b7280' }}>{item.subtitle}</p>
                                    <p style={{ fontSize: '0.82em', color: '#374151', whiteSpace: 'pre-line' }}>{item.description}</p>
                                </div>
                            ))}
                        </section>
                    );
                }

                return null;
            })}
        </div>
    );
}



// ─── TEMPLATE 5: Tech Dark Mode ──────────────────────────────────────────────
function TemplateTech({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    const containerStyle = { ...style, backgroundColor: '#0F172A', color: '#94A3B8', padding: '40px', boxSizing: 'border-box' as const, fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" };
    const headingStyle = { fontSize: '0.9em', fontWeight: 900, color: '#F8FAFC', marginBottom: '8px', marginTop: '16px' };
    const blueText = { color: '#3B82F6' };

    return (
        <div className="resume-container" style={containerStyle}>
            <div style={{ marginBottom: '5mm' }}>
                <h1 style={{ fontSize: '1.4em', fontWeight: 900, ...blueText, marginBottom: '4px' }}>{personalInfo.fullName || 'SEU NOME'}</h1>
                <p style={{ fontSize: '0.7em', color: '#94A3B8' }}>
                    {[
                        personalInfo.email,
                        personalInfo.linkedin && typeof personalInfo.linkedin === 'string' && `in/${personalInfo.linkedin.replace('https://linkedin.com/in/', '')}`,
                        personalInfo.github && typeof personalInfo.github === 'string' && `gh/${personalInfo.github.replace('https://github.com/', '')}`,
                        personalInfo.phone,
                        personalInfo.portfolio
                    ].filter(Boolean).join(' // ')}
                </p>
            </div>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                if (section.id === 'summary' && summary) {
                    return (
                        <div key={section.id} style={{ marginBottom: '5mm' }}>
                            <h2 style={headingStyle}>~/{section.id}</h2>
                            <p style={{ fontSize: '0.75em', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{summary}</p>
                        </div>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={headingStyle}>~/{section.id}</h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '12px' }}>
                                    <strong style={{ fontSize: '0.85em', fontWeight: 700, ...blueText }}>
                                        {exp.position} @ {exp.company}
                                    </strong>
                                    <p style={{ fontSize: '0.7em', color: '#64748B', marginTop: '2px', marginBottom: '4px' }}>
                                        &gt; {exp.location ? `${exp.location} // ` : ''}{normalizeAtsDate(exp.startDate)} - {exp.current ? currentLabel : exp.endDate}
                                    </p>
                                    <p style={{ fontSize: '0.75em', whiteSpace: 'pre-line' }}>{exp.description}</p>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={headingStyle}>~/{section.id}</h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '8px' }}>
                                    <strong style={{ fontSize: '0.85em', fontWeight: 700, ...blueText }}>
                                        {edu.degree} @ {edu.institution}
                                    </strong>
                                    <p style={{ fontSize: '0.7em', color: '#64748B', marginTop: '2px' }}>
                                        &gt; {edu.location ? `${edu.location} // ` : ''}{normalizeAtsDate(edu.startDate)} - {normalizeAtsDate(edu.endDate)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={headingStyle}>~/{section.id}</h2>
                            {skills.map(g => (
                                <div key={g.id} style={{ marginBottom: '6px' }}>
                                    <strong style={{ fontSize: '0.8em', ...blueText }}>{g.category}: </strong>
                                    <span style={{ fontSize: '0.75em' }}>{g.skills.join(', ')}</span>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.type === 'SIMPLE_LIST' && section.items && section.items.length > 0) {
                    const isCertSection = section.id === 'certifications';
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={headingStyle}>~/{section.id}</h2>
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.75em' }}>
                                {(section.items as any[]).map((item, i) => (
                                    <li key={i} style={{ marginBottom: '2px' }}>
                                        {isCertSection && item && typeof item === 'object' ? (
                                            <span><strong>{item.name || item.title || 'Certificação'}</strong>{item.issuer && <span> — {item.issuer}</span>}{item.date && <span> ({normalizeAtsDate(item.date)})</span>}</span>
                                        ) : typeof item === 'object' && item !== null ? (
                                            <span><strong>{item.name || item.title || ''}</strong>{item.description && <span> — {item.description}</span>}</span>
                                        ) : String(item)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                }

                if (section.type === 'DATED_LIST' && section.items && section.items.length > 0) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={headingStyle}>~/{section.id}</h2>
                            {(section.items as any[]).map(item => (
                                <div key={item.id} style={{ marginBottom: '12px' }}>
                                    <strong style={{ fontSize: '0.85em', fontWeight: 700, ...blueText }}>
                                        {item.title} {item.subtitle ? `@ ${item.subtitle}` : ''}
                                    </strong>
                                    <p style={{ fontSize: '0.7em', color: '#64748B', marginTop: '2px', marginBottom: '4px' }}>
                                        &gt; {item.location ? `${item.location} // ` : ''}{normalizeAtsDate(item.startDate)}{item.endDate ? ` - ${normalizeAtsDate(item.endDate)}` : ''}
                                    </p>
                                    <p style={{ fontSize: '0.75em', whiteSpace: 'pre-line' }}>{item.description}</p>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.type === 'TEXT' && section.content) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={headingStyle}>~/{section.id}</h2>
                            <p style={{ fontSize: '0.75em', whiteSpace: 'pre-wrap' }}>{section.content}</p>
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}

// ─── TEMPLATE 6: Compact High-Density ─────────────────────────────────────────
function TemplateCompact({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    const containerStyle = { ...style, padding: '15mm', backgroundColor: 'white', boxSizing: 'border-box' as const };
    const headerBox = { backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5mm' };
    const headingStyle = { fontSize: '0.8em', fontWeight: 900, color: '#1E293B', textTransform: 'uppercase' as const, marginBottom: '6px', marginTop: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '2px' };

    return (
        <div className="resume-container" style={containerStyle}>
            <div style={headerBox}>
                <div>
                    <h1 style={{ fontSize: '1.2em', fontWeight: 900, color: '#1E293B', margin: 0 }}>{personalInfo.fullName || 'SEU NOME'}</h1>
                    {personalInfo.title && <p style={{ fontSize: '0.75em', color: '#475569', margin: '2px 0 0 0', fontWeight: 600 }}>{personalInfo.title}</p>}
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.65em', color: '#64748B' }}>
                    {[
                        personalInfo.email,
                        personalInfo.phone,
                        personalInfo.linkedin,
                        personalInfo.github,
                        personalInfo.portfolio,
                        personalInfo.location
                    ].filter(Boolean).map((text, i) => (
                        <div key={i}>{text}</div>
                    ))}
                </div>
            </div>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                if (section.id === 'summary' && summary) {
                    return (
                        <div key={section.id}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            <p style={{ fontSize: '0.75em', color: '#475569', textAlign: 'justify', whiteSpace: 'pre-line' }}>{summary}</p>
                        </div>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <div key={section.id}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: '0.8em', color: '#1E293B' }}>{exp.position} — {exp.company}</strong>
                                        <span style={{ fontSize: '0.7em', color: '#64748B' }}>{normalizeAtsDate(exp.startDate)} - {exp.current ? currentLabel : exp.endDate}</span>
                                    </div>
                                    <p style={{ fontSize: '0.75em', color: '#475569', whiteSpace: 'pre-line', marginTop: '2px' }}>{exp.description}</p>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <div key={section.id}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: '0.8em', color: '#1E293B' }}>{edu.degree} @ {edu.institution}</strong>
                                        <span style={{ fontSize: '0.7em', color: '#64748B' }}>{normalizeAtsDate(edu.startDate)} - {normalizeAtsDate(edu.endDate)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    return (
                        <div key={section.id}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {skills.map(g => (
                                <div key={g.id} style={{ marginBottom: '4px', fontSize: '0.75em' }}>
                                    <strong style={{ color: '#1E293B' }}>{g.category}: </strong>
                                    <span style={{ color: '#475569' }}>{g.skills.join(', ')}</span>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.type === 'SIMPLE_LIST' && section.items && section.items.length > 0) {
                    const isCertSection = section.id === 'certifications';
                    return (
                        <div key={section.id}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.75em', color: '#475569' }}>
                                {(section.items as any[]).map((item, i) => (
                                    <li key={i} style={{ marginBottom: '2px' }}>
                                        {isCertSection && typeof item === 'object' ? (
                                            <span><strong>{item.name || item.title || 'Certificação'}</strong>{item.issuer && <span> — {item.issuer}</span>}{item.date && <span> ({normalizeAtsDate(item.date)})</span>}</span>
                                        ) : typeof item === 'object' ? (
                                            <span><strong>{item.name || item.title || ''}</strong>{item.description && <span> — {item.description}</span>}</span>
                                        ) : String(item)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                }

                if (section.type === 'DATED_LIST' && section.items && section.items.length > 0) {
                    return (
                        <div key={section.id}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            {(section.items as any[]).map(item => (
                                <div key={item.id} style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <strong style={{ fontSize: '0.8em', color: '#1E293B' }}>{item.title} {item.subtitle ? `— ${item.subtitle}` : ''}</strong>
                                        <span style={{ fontSize: '0.7em', color: '#64748B' }}>{normalizeAtsDate(item.startDate)}{item.endDate ? ` - ${normalizeAtsDate(item.endDate)}` : ''}</span>
                                    </div>
                                    <p style={{ fontSize: '0.75em', color: '#475569', whiteSpace: 'pre-line', marginTop: '2px' }}>{item.description}</p>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.type === 'TEXT' && section.content) {
                    return (
                        <div key={section.id}>
                            <h2 style={headingStyle}>{section.title}</h2>
                            <p style={{ fontSize: '0.75em', color: '#475569', whiteSpace: 'pre-wrap' }}>{section.content}</p>
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}
// ─── TEMPLATE 7: Harvard Strict ATS ─────────────────────────────────────────────
function TemplateHarvard({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    return (
        <div className="resume-container" style={{ ...style, background: 'white', color: '#000000', padding: '15mm', boxSizing: 'border-box', fontFamily: appearance.fontFamily === 'Inter' ? 'Georgia, serif' : style.fontFamily }}>
            <header style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h1 style={{ fontSize: '1.8em', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {personalInfo.fullName || 'SEU NOME'}
                </h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', fontSize: '0.85em', color: '#000000' }}>
                    {personalInfo.location && <span>{personalInfo.location}</span>}
                    {personalInfo.phone && <span>• {personalInfo.phone}</span>}
                    {personalInfo.email && <span>• {personalInfo.email}</span>}
                    {personalInfo.linkedin && <span>• {personalInfo.linkedin}</span>}
                    {personalInfo.github && <span>• {personalInfo.github}</span>}
                    {personalInfo.portfolio && <span>• {personalInfo.portfolio}</span>}
                </div>
            </header>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                if (section.id === 'summary' && summary) {
                    return (
                        <section key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1em', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '8px' }}>
                                {section.title}
                            </h2>
                            <p style={{ fontSize: '0.9em', textAlign: 'justify', whiteSpace: 'pre-line' }}>{summary}</p>
                        </section>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1em', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '12px' }}>
                                {section.title}
                            </h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 'bold' }}>
                                        <span>{exp.position}</span>
                                        <span style={{ fontSize: '0.9em', fontWeight: 'normal' }}>
                                                                                        {normalizeAtsDate(exp.startDate)} — {exp.current ? getCurrentLabel('pt') : exp.endDate}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontStyle: 'italic', marginBottom: '4px' }}>
                                        <span>{exp.company}</span>
                                        <span style={{ fontSize: '0.9em' }}>{exp.location}</span>
                                    </div>
                                    <div style={{ fontSize: '0.9em', whiteSpace: 'pre-line', paddingLeft: '12px' }}>
                                        {(typeof exp.description === 'string' ? exp.description : String(exp.description || '')).split('\n').map((line, i) => {
                                            const trimmed = line.trim();
                                            if (!trimmed) return null;
                                            return trimmed.startsWith('•') || trimmed.startsWith('-') ? (
                                                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
                                                    <span>•</span>
                                                    <span>{trimmed.substring(1).trim()}</span>
                                                </div>
                                            ) : (
                                                <div key={i} style={{ marginBottom: '2px' }}>{trimmed}</div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1em', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '12px' }}>
                                {section.title}
                            </h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 'bold' }}>
                                        <span>{edu.institution}</span>
                                        <span style={{ fontSize: '0.9em', fontWeight: 'normal' }}>{edu.location}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <span style={{ fontStyle: 'italic' }}>{edu.degree}</span>
                                        <span style={{ fontSize: '0.9em' }}>{normalizeAtsDate(edu.startDate)}{edu.endDate && ` — ${normalizeAtsDate(edu.endDate)}`}</span>
                                    </div>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1em', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '8px' }}>
                                {section.title}
                            </h2>
                            <div style={{ fontSize: '0.9em' }}>
                                {skills.map(g => (
                                    <div key={g.id} style={{ marginBottom: '4px' }}>
                                        <strong>{g.category}:</strong> {g.skills.join(', ')}
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                }

                // Generic text/lists for ATS strict parsing
                if (section.type === 'TEXT' && section.content) {
                    return (
                        <section key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1em', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '8px' }}>{section.title}</h2>
                            <div style={{ fontSize: '0.9em', whiteSpace: 'pre-line' }}>{section.content}</div>
                        </section>
                    );
                }

                if (section.type === 'SIMPLE_LIST' && section.items && section.items.length > 0) {
                    const isCertSection = section.id === 'certifications';
                    return (
                        <section key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1em', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '8px' }}>{section.title}</h2>
                            <ul style={{ fontSize: '0.9em', margin: 0, paddingLeft: '18px' }}>
                                {(section.items as any[]).map((item, i) => (
                                    <li key={i} style={{ marginBottom: '4px' }}>
                                        {isCertSection && item && typeof item === 'object' ? (
                                            <span><strong>{item.name || item.title || 'Certificação'}</strong>{item.issuer && <span> — {item.issuer}</span>}{item.date && <span> ({normalizeAtsDate(item.date)})</span>}</span>
                                        ) : typeof item === 'object' && item !== null ? (
                                            <span><strong>{item.name || item.title || ''}</strong>{item.description && <span> — {item.description}</span>}</span>
                                        ) : String(item)}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                }

                return null;
            })}
        </div>
    );
}

// ─── TEMPLATE 8: Corporate Standard ─────────────────────────────────────────────
function TemplateCorporate({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    return (
        <div className="resume-container" style={{ ...style, background: 'white', color: '#111827', padding: '15mm', boxSizing: 'border-box' }}>
            <header style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '2.2em', fontWeight: 800, color: '#111827', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                    {personalInfo.fullName || 'SEU NOME'}
                </h1>
                <p style={{ fontSize: '1.2em', color: '#4b5563', margin: '0 0 12px 0', fontWeight: 500 }}>
                    {personalInfo.title || 'SEU CARGO'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.85em', color: '#4b5563' }}>
                    {personalInfo.location && <span>{personalInfo.location}</span>}
                    {personalInfo.email && <span>• {personalInfo.email}</span>}
                    {personalInfo.phone && <span>• {personalInfo.phone}</span>}
                    {personalInfo.linkedin && <span>• {personalInfo.linkedin}</span>}
                    {personalInfo.github && <span>• {personalInfo.github}</span>}
                    {personalInfo.portfolio && <span>• {personalInfo.portfolio}</span>}
                </div>
            </header>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                if (section.id === 'summary' && summary) {
                    return (
                        <section key={section.id} style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '0.9em', fontWeight: 800, textTransform: 'uppercase', color: '#111827', marginBottom: '8px' }}>
                                {section.title}
                            </h2>
                            <p style={{ fontSize: '0.9em', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{summary}</p>
                        </section>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '0.9em', fontWeight: 800, textTransform: 'uppercase', color: '#111827', marginBottom: '12px' }}>
                                {section.title}
                            </h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                                        <div>
                                            <strong style={{ color: '#111827', fontSize: '1em' }}>{exp.position}</strong>
                                            <span style={{ margin: '0 8px', color: '#9ca3af' }}>|</span>
                                            <span style={{ color: '#4b5563', fontWeight: 500 }}>{exp.company}</span>
                                        </div>
                                        <span style={{ fontSize: '0.85em', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                                                                        {normalizeAtsDate(exp.startDate)} — {exp.current ? getCurrentLabel('pt') : exp.endDate}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.9em', color: '#4b5563', whiteSpace: 'pre-line', marginTop: '6px' }}>
                                        {(typeof exp.description === 'string' ? exp.description : String(exp.description || '')).split('\n').map((line, i) => {
                                            const trimmed = line.trim();
                                            if (!trimmed) return null;
                                            return trimmed.startsWith('•') || trimmed.startsWith('-') ? (
                                                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                                    <span style={{ color: '#9ca3af' }}>•</span>
                                                    <span>{trimmed.substring(1).trim()}</span>
                                                </div>
                                            ) : (
                                                <div key={i} style={{ marginBottom: '4px' }}>{trimmed}</div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '0.9em', fontWeight: 800, textTransform: 'uppercase', color: '#111827', marginBottom: '12px' }}>
                                {section.title}
                            </h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <strong style={{ color: '#111827', fontSize: '1em' }}>{edu.degree}</strong>
                                            <div style={{ color: '#4b5563', fontSize: '0.9em', marginTop: '2px' }}>{edu.institution}{edu.location && `, ${edu.location}`}</div>
                                        </div>
                                        <span style={{ fontSize: '0.85em', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                            {normalizeAtsDate(edu.startDate)}{edu.endDate && ` — ${normalizeAtsDate(edu.endDate)}`}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </section>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    return (
                        <section key={section.id} style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '0.9em', fontWeight: 800, textTransform: 'uppercase', color: '#111827', marginBottom: '8px' }}>
                                {section.title}
                            </h2>
                            <div style={{ fontSize: '0.9em', color: '#374151', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {skills.map(g => (
                                    <div key={g.id}>
                                        <strong style={{ color: '#111827' }}>{g.category}:</strong> {g.skills.join(', ')}
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                }

                // Default renders
                if (section.type === 'TEXT' && section.content) {
                    return (
                        <section key={section.id} style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '0.9em', fontWeight: 800, textTransform: 'uppercase', color: '#111827', marginBottom: '8px' }}>{section.title}</h2>
                            <p style={{ fontSize: '0.9em', color: '#374151', whiteSpace: 'pre-line' }}>{section.content}</p>
                        </section>
                    );
                }

                if (section.type === 'SIMPLE_LIST' && section.items && section.items.length > 0) {
                    const isCertSection = section.id === 'certifications';
                    return (
                        <section key={section.id} style={{ marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '0.9em', fontWeight: 800, textTransform: 'uppercase', color: '#111827', marginBottom: '8px' }}>{section.title}</h2>
                            <ul style={{ fontSize: '0.9em', margin: 0, paddingLeft: '18px', color: '#374151' }}>
                                {section.items.map((item: any, i: number) => (
                                    <li key={i} style={{ marginBottom: '4px' }}>
                                        {isCertSection && item && typeof item === 'object' ? (
                                            <span>
                                                <strong>{item.name || item.title || 'Certificação'}</strong>
                                                {item.issuer && <span> — {item.issuer}</span>}
                                                {item.date && <span> ({normalizeAtsDate(item.date)})</span>}
                                            </span>
                                        ) : typeof item === 'object' && item !== null ? (
                                            <span>
                                                <strong>{item.name || item.title || ''}</strong>
                                                {item.description && <span> — {item.description}</span>}
                                            </span>
                                        ) : (
                                            String(item)
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                }

                return null;
            })}
        </div>
    );
}

// ─── TEMPLATE 9: ATS Optimal Max ────────────────────────────────────────────────
function TemplateATSOptimal({ data, currentLabel }: { data: ResumeData; currentLabel?: string }) {
    if (!data) return null;
    const { personalInfo = {} as PersonalInfo, summary, experiences = [], education = [], skills = [], appearance = {} as AppearanceSettings, sectionsConfig = [] } = data;
    const style = getStyles(appearance);

    // Force maximum ATS safety with standard fonts
    const fontToUse = "Arial, Helvetica, sans-serif";

    return (
        <div className="resume-container" style={{ ...style, background: 'white', color: 'black', padding: '15mm', boxSizing: 'border-box', fontFamily: fontToUse }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.4em', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {stripEmojis(personalInfo.fullName) || 'SEU NOME'}
                </h1>
                <div style={{ fontSize: '0.9em', color: 'black', lineHeight: 1.4 }}>
                    {personalInfo.email && <div>{stripEmojis(`Email: ${personalInfo.email}`)}</div>}
                    {personalInfo.phone && <div>{stripEmojis(`Phone: ${personalInfo.phone}`)}</div>}
                    {personalInfo.location && <div>{stripEmojis(personalInfo.location)}</div>}
                    {personalInfo.linkedin && <div>{stripEmojis(`LinkedIn: ${personalInfo.linkedin}`)}</div>}
                    {personalInfo.github && <div>{stripEmojis(`GitHub: ${personalInfo.github}`)}</div>}
                    {personalInfo.portfolio && <div>{stripEmojis(`Portfolio: ${personalInfo.portfolio}`)}</div>}
                </div>
            </div>

            {(sectionsConfig || []).filter(s => s.active && s.id !== 'personal').map(section => {
                if (section.id === 'summary' && summary) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.1em', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '8px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            <p style={{ fontSize: '1em', textAlign: 'justify', whiteSpace: 'pre-line', margin: 0 }}>
                                {stripEmojis(summary)}
                            </p>
                        </div>
                    );
                }

                if (section.id === 'experience' && experiences.length > 0) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.1em', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '12px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            {experiences.map(exp => (
                                <div key={exp.id} style={{ marginBottom: '12px' }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold' }}>{stripEmojis(exp.position)}</span>
                                        <span style={{ float: 'right' }}>
                                            {normalizeAtsDate(exp.startDate)} - {exp.current ? currentLabel : exp.endDate}
                                        </span>
                                    </div>
                                    <div style={{ fontStyle: 'italic', marginBottom: '4px' }}>
                                        {stripEmojis(exp.company)}{exp.location ? `, ${stripEmojis(exp.location)}` : ''}
                                    </div>
                                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '1em' }}>
                                        {stripEmojis(typeof exp.description === 'string' ? exp.description : String(exp.description || '')).split('\n').map((line, i) => {
                                            const trimmed = typeof line === 'string' ? line.trim().replace(/^[-•]\s*/, '') : '';
                                            if (!trimmed) return null;
                                            return (
                                                <li key={i} style={{ marginBottom: '2px' }}>{trimmed}</li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.id === 'education' && education.length > 0) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.1em', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '12px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            {education.map(edu => (
                                <div key={edu.id} style={{ marginBottom: '8px' }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold' }}>{stripEmojis(edu.degree)}</span>
                                        <span style={{ float: 'right' }}>{normalizeAtsDate(edu.startDate)}{edu.endDate && ` - ${normalizeAtsDate(edu.endDate)}`}</span>
                                    </div>
                                    <div>
                                        {stripEmojis(edu.institution)}{edu.location ? `, ${stripEmojis(edu.location)}` : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }

                if (section.id === 'skills' && skills.length > 0) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.1em', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '8px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            <div style={{ fontSize: '1em' }}>
                                {skills.map(g => (
                                    <div key={g.id} style={{ marginBottom: '4px' }}>
                                        <strong>{stripEmojis(g.category)}:</strong> {stripEmojis(g.skills.join(', '))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                }

                // Generic text/lists
                if (section.type === 'TEXT' && section.content) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.1em', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '8px' }}>{stripEmojis(section.title)}</h2>
                            <div style={{ fontSize: '1em', whiteSpace: 'pre-line' }}>{stripEmojis(section.content)}</div>
                        </div>
                    );
                }

                if (section.type === 'SIMPLE_LIST' && section.items && section.items.length > 0) {
                    const isCertSection = section.id === 'certifications';
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.1em', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '8px' }}>{stripEmojis(section.title)}</h2>
                            <ul style={{ fontSize: '1em', margin: 0, paddingLeft: '18px' }}>
                                {(section.items as any[]).map((item, i) => (
                                    <li key={i} style={{ marginBottom: '4px' }}>
                                        {isCertSection && item && typeof item === 'object' && item.name ? (
                                            <span><strong>{stripEmojis(item.name)}</strong>{item.issuer && <span> — {stripEmojis(item.issuer)}</span>}{item.date && <span> ({normalizeAtsDate(item.date)})</span>}</span>
                                        ) : stripEmojis(String(item))}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                }

                if (section.type === 'DATED_LIST' && section.items && section.items.length > 0) {
                    return (
                        <div key={section.id} style={{ marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1.1em', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '12px' }}>
                                {stripEmojis(section.title)}
                            </h2>
                            {(section.items as any[]).map(item => (
                                <div key={item.id} style={{ marginBottom: '12px' }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold' }}>{stripEmojis(item.title)}</span>
                                        <span style={{ float: 'right' }}>
                                            {normalizeAtsDate(item.startDate)}{item.endDate ? ` - ${normalizeAtsDate(item.endDate)}` : ''}
                                        </span>
                                    </div>
                                    {item.subtitle && (
                                        <div style={{ fontStyle: 'italic', marginBottom: '4px' }}>
                                            {stripEmojis(item.subtitle)}{item.location ? `, ${stripEmojis(item.location)}` : ''}
                                        </div>
                                    )}
                                    {item.description && (
                                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '1em' }}>
                                            {stripEmojis(typeof item.description === 'string' ? item.description : String(item.description || '')).split('\n').map((line: string, i: number) => {
                                                const trimmed = typeof line === 'string' ? line.trim().replace(/^[-•]\s*/, '') : '';
                                                if (!trimmed) return null;
                                                return <li key={i} style={{ marginBottom: '2px' }}>{trimmed}</li>;
                                            })}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}

export function ResumePreview({ data: explicitData, showPageBreaks = false }: { data?: any, showPageBreaks?: boolean }) {
    const storeData = useResumeStore(state => state.data);
    const data = explicitData || storeData;
    const size = PAGE_SIZES[(data?.appearance?.pageSize as keyof typeof PAGE_SIZES) || 'A4'] || PAGE_SIZES['A4'];
    const language = data?.language || 'pt';
    const { t } = useTranslation();
    
    const printFontFamily = FONT_MAP[data?.appearance?.fontFamily] || FONT_MAP['Inter'];
    const printFontSize = data?.appearance?.fontSize ? `${data.appearance.fontSize}pt` : '11pt';
    const printLineHeight = data?.appearance?.lineSpacing || '1.5';

    const renderTemplate = () => {
        switch (data.templateId) {
            case 'classic':
                return <TemplateClassic data={data} currentLabel={getCurrentLabel(language)} />;

            case 'modern':
                return <TemplateModern data={data} currentLabel={getCurrentLabel(language)} />;
            case 'tech':
                return <TemplateTech data={data} currentLabel={getCurrentLabel(language)} />;

            case 'minimalist':
                return <TemplateMinimalist data={data} currentLabel={getCurrentLabel(language)} />;
            case 'compact':
                return <TemplateCompact data={data} currentLabel={getCurrentLabel(language)} />;

            case 'executive':
                return <TemplateVienna data={data} currentLabel={getCurrentLabel(language)} />;

            case 'harvard':
                return <TemplateHarvard data={data} currentLabel={getCurrentLabel(language)} />;

            case 'corporate':
                return <TemplateCorporate data={data} currentLabel={getCurrentLabel(language)} />;

            case 'ats-optimal':
                return <TemplateATSOptimal data={data} currentLabel={getCurrentLabel(language)} />;

            default:
                return <TemplateClassic data={data} currentLabel={getCurrentLabel(language)} />;
        }
    };

    const printableWidth = `calc(${size.width} - 20mm)`;
    const printStyles = `
                @media print {
                    @page {
                        margin: 10mm;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    #resume-print-container {
                        transform: none !important;
                        width: ${printableWidth} !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                    }
                    .resume-container {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        font-family: ${printFontFamily} !important;
                        font-size: ${printFontSize} !important;
                        line-height: ${printLineHeight} !important;
                    }
                    .page-break-indicator { display: none !important; }
                }
                `;

    return (
        <div className="relative overflow-hidden resume-preview-wrapper">
            <style dangerouslySetInnerHTML={{ __html: printStyles + `
                .page-break-indicator {                    position: absolute;
                    left: 0;
                    right: 0;
                    height: 24px;
                    background-color: #f8fafc;
                    border-top: 1px solid #e2e8f0;
                    border-bottom: 1px solid #e2e8f0;
                    box-shadow: inset 0 4px 6px -1px rgb(0 0 0 / 0.05), inset 0 2px 4px -2px rgb(0 0 0 / 0.05);
                    z-index: 50;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transform: translateY(-50%);
                }
                .page-break-label {
                    background: #cbd5e1;
                    color: #475569;
                    font-size: 9px;
                    font-weight: 800;
                    padding: 2px 8px;
                    border-radius: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }
            `}} />
            
            {showPageBreaks && (
                <>
                    <div className="page-break-indicator" style={{ top: size.minHeight }}>
                        <span className="page-break-label">{t('editor.pageBreakEnd')} 1</span>
                    </div>
                    <div className="page-break-indicator" style={{ top: `calc(${size.minHeight} * 2)` }}>
                        <span className="page-break-label">{t('editor.pageBreakEnd')} 2</span>
                    </div>
                    <div className="page-break-indicator" style={{ top: `calc(${size.minHeight} * 3)` }}>
                        <span className="page-break-label">{t('editor.pageBreakEnd')} 3</span>
                    </div>
                </>
            )}

            {renderTemplate()}
            <PrintDisclaimer t={t} />
        </div>
    );
}
