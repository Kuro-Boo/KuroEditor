/**
 * IME 変換中のキー入力か(仕様 editor-editor-spec-ime)。
 * 日本語入力では変換候補の確定に Enter を押すが、その keydown は
 * 「文字を確定するための Enter」であって「Enter キーを押した」ではない。
 * 素通しすると入力欄が閉じたり、追加・送信が文字の途中で走ったりする。
 * isComposing が正、keyCode 229 は古い Safari / Android IME 向けの保険。
 *
 * エディタの外(KuroCMS の管理画面など)の入力欄も、Enter を拾うときはこれを通す。
 * DOM に触れない純関数なので、どこからでも読める。
 * @param {KeyboardEvent} e
 */
export function isImeComposing(e) {
  return !!(e?.isComposing || e?.keyCode === 229)
}
