<script>
  import { createEventDispatcher } from 'svelte';
  import Switcher from './Switcher.svelte';
  import {portal} from "svelte-portal";
  import {disableScroll, enableScroll} from "./disable-scroll";

  export let date = new Date();
  export let visible = false;
  export let startDate = new Date(1900, 0, 1);
  export let endDate = new Date(2100, 11, 31);
  export let classes = '';
  export let hideReset = false;

  let yearDragging = false;
  let monthDragging = false;
  let dayDragging = false;

  const ALL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const ALL_DAYS = new Array(31).fill(0).map((v, i) => i + 1);
  const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dispatch = createEventDispatcher();

  function equalYear(date1, date2) {
    return (date1.getFullYear() == date2.getFullYear());
  }

  function equalMonth(date1, date2) {
    return equalYear(date1, date2) && date1.getMonth() == date2.getMonth();
  }

  function getDaysOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }

  let _date, lastDate, startMonth = 0, endMonth = 12, startDay = 0, endDay;
  $: yearsCount = endDate.getFullYear() - startDate.getFullYear() + 1;
  $: {
    const lastYear = equalYear(date, endDate);
    const firstYear = equalYear(date, startDate);
    if(lastYear) {
      endMonth = endDate.getMonth() + 1;
      if(equalMonth(date, endDate)) {
        endDay = endDate.getDate();
      } else {
        endDay = getDaysOfMonth(date);
      }
    } else { 
      endMonth = 12;
      endDay = getDaysOfMonth(date);
    } 

    if(firstYear) {
      startMonth = startDate.getMonth();
      if(equalMonth(date, startDate)) {
        startDay = startDate.getDate();
      } else {
        startDay = 1;
      }
    } else {
      startMonth = 0;
      startDay = 1;
    }
  }
  $: YEARS = new Array(yearsCount).fill(startDate.getFullYear()).map((v, i) => v + i);
  $: DAYS = ALL_DAYS.slice(startDay - 1, endDay);
  $: MONTHS = ALL_MONTHS.slice(startMonth, endMonth);
  $:  _date = date.toLocaleDateString("en-US");
  
  const toggleVisibility = () => {
    if(!visible) {
      lastDate = date;
      disableScroll();
    } else enableScroll()
    visible = !visible; 
  }

  const openModal = () => {
    if(!visible) {
      toggleVisibility()
    }
  }


  const resetDate = () => {
    date = lastDate;
  }

  function findClosestIntervalMember(start, end, oldVal) {
    if(oldVal >= end) {
      return end;
    }
    if(oldVal <= start) {
      return start;
    }

    return oldVal;
  }

  function chooseMonthOnYearSwitch(newYear) {
    if(newYear == startDate.getFullYear()) {
      return findClosestIntervalMember(startDate.getMonth(), 11, date.getMonth());
    }
    if(newYear == endDate.getFullYear()) {
      return findClosestIntervalMember(0, endDate.getMonth(), date.getMonth());
    }

    return date.getMonth();
  }

  function chooseDayOnMonthSwitch(newMonth, year = date.getFullYear()) {
    const oldMonth = date.getMonth();
    const oldDay = date.getDate();
    const newMonthDays = getDaysOfMonth(new Date(year, newMonth, 1));
    if(oldMonth == startDate.getMonth()) {
      return findClosestIntervalMember(startDate.getDate(), newMonthDays, date.getDate());
    }
    if(oldMonth == endDate.getMonth()) {
      return findClosestIntervalMember(1, endDate.getDate(), date.getDate());
    }

    return newMonthDays;
  }

  

  const dateChanged = (event) => {

    let {type, changedData} = event.detail;
    let newDate = new Date();

    if (type === 'day') {
      newDate = new Date(date.getFullYear(), date.getMonth(), changedData + startDay)
    } else if (type === 'month') {
      const selectedMonth = changedData + startMonth;
      const maxDayInSelectedMonth = new Date(date.getFullYear(), selectedMonth + 1, 0).getDate()
      const day = Math.max(Math.min(date.getDate(), maxDayInSelectedMonth, endDay), startDay + 1);
      newDate = new Date(date.getFullYear(), selectedMonth, day);
    } else if (type === 'year') {
      const maxDayInSelectedMonth = new Date(endDate.getFullYear() + changedData, date.getMonth() + 1, 0).getDate();
      const year = startDate.getFullYear() + changedData;
      const month = chooseMonthOnYearSwitch(year);
      const day = chooseDayOnMonthSwitch(month, year);
      newDate = new Date(year, month, day);
    }

    date = newDate;
    dispatch('dateChange', {date});
  }

  function confirmDate(event){
    toggleVisibility();
    dispatch('confirmDate', {MouseEvent:event, date});
  }

  function clickedOutside(event){
    if(![dayDragging, monthDragging, yearDragging].some(Boolean)) {
      toggleVisibility();
    }
  }
  
</script>

<style>
.touch-date-popup{
  z-index: 1;
  position: fixed;
  top:0;
  left:0;
  right:0;
  bottom:0;
  background: rgba(0, 0, 0, 0.3);
  touch-action: pan-down;
}
.touch-date-popup > div{
  background: var(--svtd-popup-bg-color, white);
  color: var(--svtd-popup-color, black);
  margin-top: 30vh;
  width: 85%;
  margin-left: 7%;
  border-radius: var(--svtd-popup-radius, 10px);
}
.touch-date-wrapper{
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  font-size: var(--svtd-font-size, 20px);
  padding: 1.5rem;
}

.touch-date-picker {
  display: flex;
  padding: 50px 20px;
  margin: 10px 0;
  overflow: hidden;
}

.touch-date-reset > button {
  width: 100px;
  height: 30px;
  border-radius: 15px;
  border: var(--svtd-border, 1px solid grey);
  outline: none;
  color: var(--svtd-button-color, black);
  background-color: var(--svtd-button-bg-color, transparent);
  box-shadow: var(--svtd-button-box-shadow, none) ;
  font-weight: 300;
}
.touch-date-reset button:active {
  -webkit-transform: scale(0.95);
          transform: scale(0.95);
}

.date-line {
  font-size: 30px;
  font-weight: 300;
}
.day-line{
  margin: 2px;
}
</style>

<input type="text" class='{classes}' readonly value={_date} on:focus={openModal}>
{#if visible}
  <div class="touch-date-popup" use:portal hidden on:scroll|stopPropagation={() => {}} on:mousedown|self={clickedOutside} >
    <div>
      <div class="touch-date-wrapper">
        <div class='date-line'>{ date.getDate() } { ALL_MONTHS[date.getMonth()] } { date.getFullYear() }</div>
        <p class='day-line'>{ WEEKDAY[date.getDay()] }</p>
        <div class='touch-date-picker'>
          <Switcher 
            bind:dragging={dayDragging} 
            type='day' 
            data={DAYS} 
            selected={date.getDate() - startDay} 
            on:dateChange={dateChanged}/>
          <Switcher 
            bind:dragging={monthDragging} 
            type='month' data={MONTHS} 
            selected={date.getMonth() - startMonth} 
            on:dateChange={dateChanged}/>
          <Switcher 
            bind:dragging={yearDragging} 
            type='year' 
            data={YEARS} 
            selected={date.getFullYear() - startDate.getFullYear()} 
            on:dateChange={dateChanged}/>
        </div>
        <div class='touch-date-reset'>
          {#if !hideReset}
            <button on:click|stopPropagation={resetDate}>Reset</button>
          {/if}
          <button on:click|stopPropagation={confirmDate}>Ok</button>
        </div>
      </div>
    </div>
  </div>
{/if}

