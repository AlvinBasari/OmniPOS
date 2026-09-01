using OmniPos.Core.Enums;

namespace OmniPos.Core.Entities.Products;

public class Category : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ColorHex { get; set; }
    public string? IconName { get; set; }
    public int SortOrder { get; set; } = 0;
    public BusinessMode BusinessMode { get; set; } = BusinessMode.FoodAndBeverage;
    
    public ICollection<Product> Products { get; set; } = new List<Product>();
}

public class Product : BaseEntity
{
    public string Sku { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public BusinessMode BusinessMode { get; set; } = BusinessMode.FoodAndBeverage;
    
    public string CategoryId { get; set; } = string.Empty;
    public Category? Category { get; set; }
    
    public string Unit { get; set; } = "PCS"; // PCS, KG, PORSI, BOX, DUS
    public decimal BuyPrice { get; set; } = 0; // HPP
    public decimal SellPrice { get; set; } = 0;
    public decimal? WholesalePrice { get; set; }
    public decimal? WholesaleMinQty { get; set; }
    
    public bool HasVariants { get; set; } = false;
    public bool TrackStock { get; set; } = true;
    public bool IsKitchenItem { get; set; } = false; // Trigger KDS / Kitchen Ticket
    public string? KitchenStation { get; set; } // BAR, KITCHEN, GRILL
    
    public decimal CurrentStock { get; set; } = 0;
    public decimal MinStockAlert { get; set; } = 5;
    
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    public ICollection<ProductModifierGroup> ModifierGroups { get; set; } = new List<ProductModifierGroup>();
    public ICollection<ProductUnitConversion> UnitConversions { get; set; } = new List<ProductUnitConversion>();
    public Recipe? Recipe { get; set; }
}

public class ProductUnitConversion : BaseEntity
{
    public string ProductId { get; set; } = string.Empty;
    public Product? Product { get; set; }

    public string UnitName { get; set; } = "DUS"; // e.g. DUS, LUSIN, RENTENG, KARTON
    public decimal ConversionFactor { get; set; } = 1; // e.g. 40 (1 Dus = 40 Pcs)
    public string? Barcode { get; set; } // Specific barcode on carton/box
    public string? Sku { get; set; }
    public decimal SellPrice { get; set; } = 0; // Special box selling price
    public decimal BuyPrice { get; set; } = 0;
}

public class ProductVariant : BaseEntity
{
    public string ProductId { get; set; } = string.Empty;
    public Product? Product { get; set; }
    
    public string Name { get; set; } = string.Empty; // e.g. "Size: L", "Rasa: Cokelat"
    public string? Sku { get; set; }
    public string? Barcode { get; set; }
    public decimal AdditionalPrice { get; set; } = 0;
    public decimal AdditionalCost { get; set; } = 0;
    public decimal CurrentStock { get; set; } = 0;
}

public class ModifierGroup : BaseEntity
{
    public string Name { get; set; } = string.Empty; // e.g. "Level Gula", "Topping Tambahan"
    public bool IsRequired { get; set; } = false;
    public int MaxSelections { get; set; } = 1;
    public ICollection<ModifierOption> Options { get; set; } = new List<ModifierOption>();
}

public class ModifierOption : BaseEntity
{
    public string ModifierGroupId { get; set; } = string.Empty;
    public ModifierGroup? ModifierGroup { get; set; }
    
    public string Name { get; set; } = string.Empty; // e.g. "Extra Shot", "Less Ice"
    public decimal Price { get; set; } = 0;
    public decimal Cost { get; set; } = 0;
}

public class ProductModifierGroup : BaseEntity
{
    public string ProductId { get; set; } = string.Empty;
    public Product? Product { get; set; }
    
    public string ModifierGroupId { get; set; } = string.Empty;
    public ModifierGroup? ModifierGroup { get; set; }
}

public class Recipe : BaseEntity
{
    public string ProductId { get; set; } = string.Empty;
    public Product? Product { get; set; }
    
    public string? Instructions { get; set; }
    public ICollection<RecipeItem> Items { get; set; } = new List<RecipeItem>();
}

public class RecipeItem : BaseEntity
{
    public string RecipeId { get; set; } = string.Empty;
    public Recipe? Recipe { get; set; }
    
    public string IngredientProductId { get; set; } = string.Empty; // Raw Material Product
    public Product? IngredientProduct { get; set; }
    
    public decimal QuantityRequired { get; set; }
    public string Unit { get; set; } = "GRAM"; // GRAM, ML, PCS
}
