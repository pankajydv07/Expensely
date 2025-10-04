import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FormControl, InputLabel, Select, MenuItem, Box, Typography } from '@mui/material';
import { fetchCategories } from '../store/expenseSlice';

const CategoryTest = () => {
  const dispatch = useDispatch();
  const { categories, isLoading } = useSelector((state) => state.expense);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    console.log('CategoryTest: Component mounted');
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    console.log('CategoryTest: Categories updated:', categories);
    console.log('CategoryTest: Loading:', isLoading);
  }, [categories, isLoading]);

  const handleChange = (e) => {
    const value = e.target.value;
    console.log('CategoryTest: Selected category:', value, typeof value);
    setSelectedCategory(value);
  };

  return (
    <Box sx={{ p: 3, border: '1px solid #ccc', margin: 2 }}>
      <Typography variant="h6" gutterBottom>
        Category Selection Test
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 2 }}>
        Categories loaded: {categories.length} | Loading: {isLoading ? 'Yes' : 'No'}
      </Typography>
      
      <FormControl fullWidth>
        <InputLabel>Test Category</InputLabel>
        <Select
          value={selectedCategory}
          onChange={handleChange}
          label="Test Category"
        >
          {categories.map((category) => {
            console.log('CategoryTest: Rendering:', category);
            return (
              <MenuItem key={category.id} value={category.id}>
                {category.name} (ID: {category.id})
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
      
      <Typography variant="body2" sx={{ mt: 2 }}>
        Selected: {selectedCategory} (Type: {typeof selectedCategory})
      </Typography>
      
      <Typography variant="body2" sx={{ mt: 1 }}>
        Categories data: {JSON.stringify(categories)}
      </Typography>
    </Box>
  );
};

export default CategoryTest;