<script>

  import { afterUpdate, onMount, createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let selected;
  export let data = 0;
  export let type;

  let position = selected ? -(selected) * 50 : 0;
  let offset = 0;
  let dragging = false;

  let itemWrapper, previousY;


  onMount(() => {
   setPosition()
  });

  afterUpdate(() => {
		let selectedPosition = -(selected) * 50

    if (!dragging && position !== selectedPosition) {
        position = selectedPosition
        setPosition()
    }
  });


  function onDateChange(type, changedData) {
		dispatch('dateChange', {
			type, changedData
		});
  }

  function setPosition(){
     let itemPosition = `
      transition: transform ${Math.abs(offset) / 100 + 0.1}s;
      transform: translateY(${position}px)
    `;
    itemWrapper.style.cssText = itemPosition;
  }

  function onMouseDown (event) {
    previousY = event.touches ? event.touches[0].clientY : event.clientY;
    dragging = true;

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onMouseMove)
    window.addEventListener('touchend', onMouseUp)
  }

   function onMouseMove (event) {
    let clientY = event.touches ? event.touches[0].clientY : event.clientY;
    offset = clientY - previousY;

    let maxPosition = -data.length * 50;
    let _position = position + offset;
    position = Math.max(maxPosition, Math.min(50, _position))
    previousY = event.touches ? event.touches[0].clientY : event.clientY;
    setPosition();
  }

  function onMouseUp () {
    let maxPosition = -(data.length - 1) * 50;
    let rounderPosition = Math.round((position + offset * 5) / 50) * 50;
    let finalPosition = Math.max(maxPosition, Math.min(0, rounderPosition));

    dragging = false;
    position = finalPosition;

    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('touchmove', onMouseMove)
    window.removeEventListener('touchend', onMouseUp);

    setPosition();
    onDateChange(type, -finalPosition / 50);
  }

  function scrollNext() {
    position += 50;
    setPosition();
    onDateChange(type, -position / 50)
  }

  function scrollPrev() {
    console.log("prev")
    position -= 50;
    setPosition();
    onDateChange(type, -position / 50)
  }

  function onWheel (e) {
    if (e.deltaY < 0)
      {
        scrollPrev();
      }
      if (e.deltaY > 0)
      {
        scrollNext();
      }
  }


</script>


<style>
 .touch-date-wrapper {
  position: relative;
  height: 50px;
  margin: 0 10px;
  border-top: 1px solid var(--svtd-bar-color, grey);
  border-bottom: 1px solid var(--svtd-bar-color, grey);
  border-radius: 0;
}
.touch-date-container {
  margin: 0;
  padding: 0;
}

.touch-upper-cover, .touch-lower-cover {
  content: '';
  position: absolute;
  left: 0;
  width: 80px;
  height: 50px;
  background-color: #fff;
  opacity: 0.8;
  z-index: 1;
  cursor: pointer;
}

.touch-upper-cover {
  top: -51px;
}

.touch-lower-cover {
  bottom: -51px;
}

.touch-date-container li {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 80px;
  height: 50px;
  -webkit-user-select: none;
     -moz-user-select: none;
      -ms-user-select: none;
          user-select: none;
}
</style>


<div class='touch-date-wrapper' on:mousedown={onMouseDown} on:touchstart={onMouseDown} on:wheel|preventDefault={onWheel}>
  <div on:click|preventDefault={scrollNext} class="touch-upper-cover"></div>
  <ul bind:this={itemWrapper} class="touch-date-container">
   {#each data as item }
     <li>{item}</li>
   {/each}
  </ul>
  <div on:click|preventDefault={scrollPrev} class="touch-lower-cover"></div>
</div>