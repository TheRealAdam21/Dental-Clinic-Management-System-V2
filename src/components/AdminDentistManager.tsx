import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { dataService } from "@/services/dataService";
import type { Dentist } from "@/types";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminDentistManager = () => {
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingDentist, setEditingDentist] = useState<Dentist | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    specialization: "",
    email: "",
    phone: ""
  });

  const fetchDentists = async () => {
    const data = await dataService.getDentists();
    setDentists(data);
  };

  useEffect(() => {
    fetchDentists();
  }, []);

  const editForm = useMemo(() => {
    if (!editingDentist) return null;
    return {
      id: editingDentist.id,
      username: editingDentist.username,
      password: editingDentist.password,
      first_name: editingDentist.first_name,
      last_name: editingDentist.last_name,
      specialization: editingDentist.specialization ?? "",
      email: editingDentist.email ?? "",
      phone: editingDentist.phone ?? ""
    };
  }, [editingDentist]);

  const [editData, setEditData] = useState<{
    id: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
    specialization: string;
    email: string;
    phone: string;
  } | null>(null);

  useEffect(() => {
    if (editOpen && editForm) setEditData(editForm);
    if (!editOpen) setEditData(null);
  }, [editOpen, editForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.first_name || !formData.last_name) {
      toast.error("Username, password, first name, and last name are required.");
      return;
    }

    try {
      setLoading(true);
      await dataService.addDentist({
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        specialization: formData.specialization.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined
      });
      toast.success("Dentist added successfully.");
      setFormData({
        username: "",
        password: "",
        first_name: "",
        last_name: "",
        specialization: "",
        email: "",
        phone: ""
      });
      await fetchDentists();
    } catch (_error) {
      toast.error("Failed to add dentist.");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (dentist: Dentist) => {
    setEditingDentist(dentist);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editData) return;
    if (!editData.username || !editData.password || !editData.first_name || !editData.last_name) {
      toast.error("Username, password, first name, and last name are required.");
      return;
    }
    try {
      setLoading(true);
      await dataService.updateDentist(editData.id, {
        username: editData.username,
        password: editData.password,
        first_name: editData.first_name,
        last_name: editData.last_name,
        specialization: editData.specialization || undefined,
        email: editData.email || undefined,
        phone: editData.phone || undefined
      });
      toast.success("Dentist updated successfully.");
      setEditOpen(false);
      await fetchDentists();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update dentist.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (dentistId: string) => {
    if (!confirm("Delete this dentist?")) return;
    try {
      setLoading(true);
      await dataService.deleteDentist(dentistId);
      toast.success("Dentist deleted.");
      await fetchDentists();
    } catch (_e) {
      toast.error("Failed to delete dentist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Dentist</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="dentist_password">Password *</Label>
              <Input
                id="dentist_password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={formData.specialization}
                onChange={(e) => setFormData((prev) => ({ ...prev, specialization: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Dentist"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Dentists</CardTitle>
        </CardHeader>
        <CardContent>
          {dentists.length === 0 ? (
            <p className="text-sm text-gray-600">No dentists yet. Add one above.</p>
          ) : (
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {dentists.map((dentist) => (
                <div key={dentist.id} className="border rounded p-3 text-sm">
                  <p className="font-medium">Dr. {dentist.first_name} {dentist.last_name}</p>
                  <p className="text-gray-600">Username: {dentist.username}</p>
                  <p className="text-gray-600">
                    {dentist.specialization || "No specialization"}
                    {dentist.phone ? ` • ${dentist.phone}` : ""}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => openEdit(dentist)}>
                      Edit
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(dentist.id)} disabled={loading}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden p-0">
          <div className="p-6 overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Edit Dentist</DialogTitle>
            </DialogHeader>
            {editData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_username">Username *</Label>
                <Input
                  id="edit_username"
                  value={editData.username}
                  onChange={(e) => setEditData((p) => (p ? { ...p, username: e.target.value } : p))}
                />
              </div>
              <div>
                <Label htmlFor="edit_password">Password *</Label>
                <Input
                  id="edit_password"
                  type="password"
                  value={editData.password}
                  onChange={(e) => setEditData((p) => (p ? { ...p, password: e.target.value } : p))}
                />
              </div>
              <div>
                <Label htmlFor="edit_first_name">First Name *</Label>
                <Input
                  id="edit_first_name"
                  value={editData.first_name}
                  onChange={(e) => setEditData((p) => (p ? { ...p, first_name: e.target.value } : p))}
                />
              </div>
              <div>
                <Label htmlFor="edit_last_name">Last Name *</Label>
                <Input
                  id="edit_last_name"
                  value={editData.last_name}
                  onChange={(e) => setEditData((p) => (p ? { ...p, last_name: e.target.value } : p))}
                />
              </div>
              <div>
                <Label htmlFor="edit_specialization">Specialization</Label>
                <Input
                  id="edit_specialization"
                  value={editData.specialization}
                  onChange={(e) => setEditData((p) => (p ? { ...p, specialization: e.target.value } : p))}
                />
              </div>
              <div>
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData((p) => (p ? { ...p, email: e.target.value } : p))}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="edit_phone">Phone</Label>
                <Input
                  id="edit_phone"
                  value={editData.phone}
                  onChange={(e) => setEditData((p) => (p ? { ...p, phone: e.target.value } : p))}
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="button" onClick={handleUpdate} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={loading}>
                  Cancel
                </Button>
              </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDentistManager;
