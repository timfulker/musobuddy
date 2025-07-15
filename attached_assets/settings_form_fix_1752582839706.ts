// Replace your Form structure with this corrected version:

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    {/* Business Information */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Business Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Name</FormLabel>
              <FormControl>
                <Input placeholder="Your Music Services" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* ... rest of your form fields ... */}
      </CardContent>
    </Card>
    
    {/* Make sure every FormField follows this exact structure */}
    {/* Save Button */}
    <div className="flex justify-between">
      <Button 
        type="button" 
        onClick={debugFormState}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        Debug Form State
      </Button>
      <Button 
        type="submit" 
        size="lg"
        disabled={saveSettingsMutation.isPending}
        className="flex items-center gap-2"
      >
        <Save className="h-4 w-4" />
        {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  </form>
</Form>