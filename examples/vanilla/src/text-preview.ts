export class TextPreview extends HTMLElement {
  private input!: HTMLInputElement
  private output!: HTMLOutputElement

  connectedCallback() {
    this.innerHTML = `
      <section class="input-section">
        <div class="input-wrapper">
          <input type="text" placeholder="Type here to generate more updates" class="input" />
        </div>
        <output class="input-value placeholder">Your text will appear here...</output>
      </section>
    `

    this.input = this.querySelector('input')!
    this.output = this.querySelector('output')!

    this.input.addEventListener('input', () => {
      this.output.textContent = this.input.value || 'Your text will appear here...'
      this.output.classList.toggle('placeholder', this.input.value.length === 0)
    })
  }
}

customElements.define('text-preview', TextPreview)
