import { useState } from 'react'

export function TextPreview() {
  const [text, setText] = useState('')

  return (
    <section className="input-section">
      <div className="input-wrapper">
        <input type="text" placeholder="Type here to generate more updates" className="input" value={text} onChange={e => setText(e.target.value)} />
      </div>
      <output className={`input-value${text ? '' : ' placeholder'}`}>
        {text || 'Your text will appear here...'}
      </output>
    </section>
  )
}
