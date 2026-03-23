<script lang="ts">
  let text = ''
</script>

<section class="input-section">
  <div class="input-wrapper">
    <input type="text" placeholder="Type here to generate more updates" class="input" bind:value={text} />
  </div>
  <output class="input-value" class:placeholder={!text}>
    {text || 'Your text will appear here...'}
  </output>
</section>
