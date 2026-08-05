/**
 * Bề mặt công khai của bảng SEO Rank Math.
 * Bên import nên luôn đi qua file tổng này để việc di chuyển file nội bộ
 * không làm hỏng bên tiêu thụ.
 */
export { RankMathSeoBox } from './RankMathSeoBox';
export { SeoTabs }            from './SeoTabs';
export { SnippetPreview }     from './SnippetPreview';
export { FocusKeywordInput }  from './FocusKeywordInput';
export { SeoChecklist }       from './SeoChecklist';
export { SnippetEditModal }   from './SnippetEditModal';
export { KeywordManagerModal } from './KeywordManagerModal';
export { calculateSeoScore, groupChecksBySection } from './lib/calculateSeoScore';