/** IME 変換中のキー入力か(変換確定の Enter を「Enter を押した」と扱わないため)。 */
export function isImeComposing(e: { isComposing?: boolean; keyCode?: number } | null | undefined): boolean;
