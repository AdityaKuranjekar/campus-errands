/**
 * 🛡️ Campus Errands — Content Moderation Middleware
 *
 * Two-layer check:
 *   1. Profanity filter  (English + Hindi abusive words)
 *   2. Academic integrity filter
 *
 * Both return: { decision: "ALLOW" | "BLOCK", type, reason }
 */

// ─── 1. PROFANITY WORD LIST ────────────────────────────────────────────────
const BAD_WORDS = [
    // English
    'fuck', 'fucker', 'fucking', 'fuk', 'f u c k',
    'shit', 'shitt', 'bullshit',
    'bitch', 'btch',
    'asshole', 'ass',
    'bastard',
    'cunt',
    'dick', 'cock', 'pussy',
    'whore', 'slut',
    'nigger', 'nigga',
    'retard',
    // Hindi (transliterated)
    'madarchod', 'maderchod', 'mc',
    'bhosdike', 'bhosdika', 'bhosdi',
    'chutiya', 'chutiye', 'choot',
    'gaandu', 'gandu',
    'bkl', 'bkll',
    'randi', 'rande',
    'harami',
    'sala', 'saala',
    'kamina',
    'hijra',
    'lund', 'lavda',
    'bakrichod',
];

/**
 * Checks if text contains any profane word.
 * @param {string} text
 * @returns {{ found: boolean, word?: string }}
 */
function checkProfanity(text) {
    const lower = text.toLowerCase();
    // Normalise: collapse spaces/dots/underscores between chars
    const normalised = lower.replace(/[\s._\-*@0]+/g, '');

    for (const word of BAD_WORDS) {
        const clean = word.replace(/\s/g, '');
        // Direct substring match on normalised text
        if (normalised.includes(clean)) return { found: true, word };
        // Word-boundary match on original lower-case text
        const re = new RegExp(`\\b${word.replace(/\s+/g, '\\s*')}\\b`, 'i');
        if (re.test(lower)) return { found: true, word };
    }
    return { found: false };
}

// ─── 2. ACADEMIC INTEGRITY PATTERNS ───────────────────────────────────────
const BLOCK_PATTERNS = [
    /\b(do|complete|finish|solve|write|submit|fill|answer)\b.{0,40}\b(homework|assignment|hw|task)\b/i,
    /\bhomework\b/i,
    /\b(complete|fill|do|write|finish)\b.{0,40}\blab\b.{0,40}\b(manual|report|record|notebook|file|copy|assignment)\b/i,
    /\blab\s*(manual|report|notebook|record|file|assignment)\b/i,
    /\b(do|take|write|attempt|give|appear)\b.{0,40}\b(exam|test|quiz|viva|midsem|endsem|paper)\b/i,
    /\b(exam|quiz|test)\b.{0,50}\b(for me|on my behalf|instead of me)\b/i,
    /\b(write|code|build|create|make|prepare|develop)\b.{0,40}\b(code|report|essay|project|submission|assignment)\b.{0,40}\b(for me|my|graded)\b/i,
    /\b(my|for me)\b.{0,40}\b(code|report|project|submission)\b/i,
    /\bdo\s+my\b/i,
    /\bcomplete\s+my\b/i,
    /\bfinish\s+my\b/i,
    /\bsolve\s+my\b/i,
    /\bwrite\s+my\b/i,
    /\bsubmit\s+(on\s+my\s+behalf|for\s+me)\b/i,
    /\bon\s+my\s+behalf\b/i,
    /\binstead\s+of\s+me\b/i,
    /\b(assignment|project|submission)\b.{0,30}\b(due|deadline|submit|grade|marks|score)\b/i,
];

// ─── 3. MAIN MODERATION FUNCTION ──────────────────────────────────────────
/**
 * @param {string} title
 * @param {string} description
 * @returns {{ decision: "ALLOW"|"BLOCK", type: string, reason: string }}
 */
function moderateTask(title, description) {
    const text = `${title || ''} ${description || ''}`.trim();

    if (!text) {
        return { decision: 'ALLOW', type: 'clean', reason: 'No content to evaluate.' };
    }

    // ── Layer 1: Profanity ──
    const profCheck = checkProfanity(text);
    if (profCheck.found) {
        return {
            decision: 'BLOCK',
            type: 'profanity',
            reason: 'Inappropriate language is not allowed 🚫'
        };
    }

    // ── Layer 2: Academic integrity ──
    const blockHits = BLOCK_PATTERNS.filter(p => p.test(text));

    if (blockHits.length === 0) {
        return { decision: 'ALLOW', type: 'clean', reason: 'Task appears to be a legitimate campus errand.' };
    }

    const hasPhysicalTask   = /\b(bring|pick\s*up|deliver|fetch|collect|carry|drop)\b/i.test(text);
    const hasTeachingSignal = /\b(teach|mentor|explain|tutor|guide|help\s+me\s+understand|help\s+me\s+learn)\b/i.test(text);

    if ((hasPhysicalTask || hasTeachingSignal) && blockHits.length <= 1) {
        return { decision: 'ALLOW', type: 'clean', reason: 'Task involves physical assistance or teaching.' };
    }

    return {
        decision: 'BLOCK',
        type: 'academic',
        reason: `Task appears to request completion of academic work on behalf of another student.`
    };
}

module.exports = { moderateTask, checkProfanity };

