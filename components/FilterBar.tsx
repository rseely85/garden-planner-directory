import React, { useState } from "react";

interface FilterBarProps {
  categories: string[];
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onSortChange: (sortOption: string) => void;
  onResetFilters: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onResetFilters,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortOption, setSortOption] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearchChange(value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCategory(value);
    onCategoryChange(value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSortOption(value);
    onSortChange(value);
  };

  const handleReset = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSortOption("");
    onResetFilters();
  };

  return (
    <div className="w-full bg-white shadow-sm border border-gray-200 rounded-md p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search suppliers..."
        value={searchQuery}
        onChange={handleSearchChange}
        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      {/* Category Dropdown */}
      <select
        value={selectedCategory}
        onChange={handleCategoryChange}
        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </option>
        ))}
      </select>

      {/* Sort Dropdown */}
      <select
        value={sortOption}
        onChange={handleSortChange}
        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="">Sort By</option>
        <option value="name-asc">Name (A → Z)</option>
        <option value="name-desc">Name (Z → A)</option>
        <option value="category">Category</option>
        <option value="premium">Premium First</option>
      </select>

      {/* Reset Button */}
      <button
        onClick={handleReset}
        className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-200 transition"
      >
        Reset
      </button>
    </div>
  );
};

export default FilterBar;