import { useState, useEffect } from 'react';
import { Box, List, ListItem, FormControl, Input, FormHelperText} from '@mui/material';
import Typography from '@mui/material/Typography';
import sendTopTen from '../util/toptenAPI.js';
import { shadows } from '@mui/system';

export default function TopMale() {
  const [data, setData] = useState([]);
  const [year, setYear] = useState(2022);

  function handleYear(event) {
    const selectedYear = event.target.value || 2022;
    setYear(selectedYear);
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await sendTopTen(year, "M");
        setData(result);
      } catch (error) {
        console.log("error in fetchData: ", error);
      }
    }

    fetchData();
  }, [year]);

  let list = data.map((object, index) => {return (<ListItem><Typography variant='body1'>{index+1}. {object.name}</Typography ></ListItem>)});

  return(
    <Box sx={{
      width: 300,
      height: 500,
      backgroundColor: 'primary.light',
      marginTop: 2,
      boxShadow: 10,
      padding: "20px"
    }}>
      <Typography variant='h6'>
        Top US 10 Male Names of:
        <FormControl>
          <Input id="my-input" aria-describedby="my-helper-text" placeholder='2022' onChange={handleYear}/>
          <FormHelperText id="my-helper-text">Type in a year! YYYY. Range: 1880 to 2022</FormHelperText>
        </FormControl>
      </Typography>
      <List>
        {list}
      </List>
    </Box>
  )
}