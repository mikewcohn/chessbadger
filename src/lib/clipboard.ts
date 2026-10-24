export async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    let timeoutId: number | undefined
    try {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => reject(new Error('Clipboard timed out.')), 1500)
        }),
      ])
      return true
    } catch {
      // Fall back for browsers that block the async Clipboard API.
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }

  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.readOnly = true
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()

  try {
    const copied = document.execCommand('copy')
    activeElement?.focus()
    return copied
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}
