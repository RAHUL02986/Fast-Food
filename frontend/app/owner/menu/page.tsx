"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { menuAPI, restaurantAPI, uploadAPI } from "@/lib/api";
import { OwnerNav } from "@/components/Navs";
import Link from "next/link";
import DishImage from "@/components/DishImage";
import { secureImageUrl } from "@/lib/images";

export default function ManageMenu() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    isVeg: false,
    image: "",
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "owner")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const restData = await restaurantAPI.getOwnerRestaurant();
        setRestaurant(restData.data);

        if (restData.data) {
          const menuData = await menuAPI.getMenuItems(restData.data._id);
          setMenuItems(menuData.data || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) fetchData();
  }, [authLoading]);

  const resetForm = () => {
    setFormData({ name: "", description: "", price: "", category: "", isVeg: false, image: "" });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name || "",
      description: item.description || "",
      price: item.price != null ? String(item.price) : "",
      category: item.category || "",
      isVeg: !!item.isVeg,
      image: item.image || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPG, PNG, WebP or GIF)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large (max 5 MB)");
      return;
    }
    try {
      setUploadingImage(true);
      const { url } = await uploadAPI.uploadImage(file);
      setFormData((prev) => ({ ...prev, image: url }));
    } catch (error: any) {
      alert(error.message || "Error uploading image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteMenuItem = async (item: any) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      await menuAPI.deleteMenuItem(restaurant._id, item._id);
      setMenuItems((prev) => prev.filter((m) => m._id !== item._id));
      if (editingItem && editingItem._id === item._id) {
        resetForm();
      }
    } catch (error: any) {
      alert(error.message || "Error deleting menu item");
    }
  };

  const handleSubmitMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurant) {
      alert("Please register a restaurant first");
      return;
    }

    const payload = {
      ...formData,
      price: parseFloat(formData.price),
    };

    try {
      if (editingItem) {
        const updated = await menuAPI.updateMenuItem(restaurant._id, editingItem._id, payload);
        setMenuItems((prev) => prev.map((m) => (m._id === editingItem._id ? updated.data : m)));
        alert("Menu item updated successfully");
      } else {
        const newItem = await menuAPI.createMenuItem(restaurant._id, payload);
        setMenuItems((prev) => [...prev, newItem.data]);
        alert("Menu item added successfully");
      }
      resetForm();
    } catch (error: any) {
      alert(error.message || (editingItem ? "Error updating menu item" : "Error adding menu item"));
    }
  };

  if (authLoading || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!restaurant) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4">You need to register a restaurant first</p>
        <Link href="/owner/register-restaurant" className="bg-orange-600 text-white px-6 py-2 rounded">
          Register Restaurant
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerNav />

      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Manage Menu</h1>
          <button
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            className="bg-orange-600 text-white px-6 py-2 rounded font-bold hover:bg-orange-700"
          >
            {showForm ? "Cancel" : "Add Menu Item"}
          </button>
        </div>

        {/* Add/Edit Menu Item Form */}
        {showForm && (
          <div className="bg-white p-8 rounded-lg shadow mb-8">
            <h2 className="text-2xl font-bold mb-6">{editingItem ? `Edit: ${editingItem.name}` : "Add New Menu Item"}</h2>
            <form onSubmit={handleSubmitMenuItem} className="space-y-4">
              <input
                type="text"
                placeholder="Item Name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />

              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Price (₹)"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />

                <input
                  type="text"
                  placeholder="Category (e.g., Appetizers, Main Course)"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isVeg}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isVeg: e.target.checked }))}
                  className="rounded"
                />
                <span>Vegetarian</span>
              </label>

              {/* Item Photo */}
              <div>
                <label className="block text-sm font-semibold mb-2">Item Photo</label>
                <div className="flex items-center gap-4">
                  {formData.image && (
                    <div className="relative">
                      <img src={secureImageUrl(formData.image)} alt="Item preview" className="w-24 h-24 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, image: "" }))}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 text-sm leading-none hover:bg-red-700"
                        title="Remove photo"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <label
                    className={`cursor-pointer bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-orange-500 hover:text-orange-600 ${uploadingImage ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    {uploadingImage ? "Uploading..." : formData.image ? "Change photo" : "📷 Choose photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP or GIF — max 5 MB</p>
              </div>

              <button
                type="submit"
                className="w-full bg-orange-600 text-white py-2 rounded font-bold hover:bg-orange-700"
              >
                {editingItem ? "Update Item" : "Add Item"}
              </button>
            </form>
          </div>
        )}

        {/* Menu Items List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Menu Items ({menuItems.length})</h2>
          </div>
          <div className="divide-y">
            {menuItems.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No menu items yet</div>
            ) : (
              menuItems.map((item: any) => (
                <div key={item._id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <DishImage name={item.name} category={item.category} image={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                      <div>
                        <h3 className="font-bold mb-2">{item.name}</h3>
                        <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                        <div className="flex gap-4 text-sm">
                          <span className="font-semibold">₹{item.price}</span>
                          <span className="text-gray-600">{item.category}</span>
                          {item.isVeg && <span className="text-green-600">🥬 Vegetarian</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMenuItem(item)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
