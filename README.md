# Native like date-picker for Svelte (With wheel control for desktop)

<p>
  <a href="https://www.npmjs.com/package/svelte-touch-datepicker"><img  src="https://img.shields.io/npm/v/svelte-touch-datepicker?style=for-the-badge"/></a>
  <a href="https://www.npmjs.com/package/svelte-touch-datepicker">
    <img src="https://img.shields.io/npm/dm/svelte-touch-datepicker?style=for-the-badge"/>
  </a>
  <a href="https://svelte.dev"><img  src="https://img.shields.io/badge/svelte-v3-blueviolet?style=for-the-badge"/></a>
</p>


## 🚀[See it in Action](https://sinnerJoe.github.io/svelte-touch-datepicker/)

## Installation

```bash
npm i -D svelte-touch-datepicker
```

## Usage

```html
<script>
  import DatePicker  from "svelte-touch-datepicker";

  let date = new Date();
  $: _date = date.toLocaleDateString("en-US");

</script>

<style>

  .container{
    height: 100%;
    width: 100%;
  }

  .center {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    font: 20px 'Roboto', sans-serif;
  }
</style>

<div class="container" >
  <div class="center">
    <p>Date: {_date}</p>
    <DatePicker bind:date />
  </div>
</div>

```

## Custom events

```html
<script>
  function callback(event) {
    // you will find the `date` object in event.detail
  }
</script>

<DatePicker
  on:dateChange={callback}
  on:confirmDate={callback2}
/>


```

## Default css custom properties

```css

  :root{
    --svtd-popup-bg-color: white;
    --svtd-popup-color: black;
    --svtd-popup-radius: 10px;
    --svtd-font-size: 20px;
    --svtd-button-color: black;
    --svtd-button-bg-color: transparent;
    --svtd-border: 1px solid grey;
    --svtd-button-box-shadow: none;
    --svtd-bar-color: grey;
  }
```

## Props

| Name | Type | Description | Required | Default |
| --- | --- | --- | --- | --- |
| `date` | `object` | default date object | yes | `new Date()` |
| `visible` | `Boolean` | Popup visibility | No | `false` |
| `startDate` | `Date` | The beginning of the interval that can be picked | No | `new Date(1900, 0, 1)` |
| `endDate` | `Date` | The end of the interval that can be picked | No | `new Date(2100, 11, 31)` |
| `classes` | `String` | custom classes attached to the input | No | `empty string` |
