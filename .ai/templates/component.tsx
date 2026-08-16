// @ts-nocheck

// Component Template
// This template follows the required patterns for client components in the Topia SDK AI Template

/**
 * Home page component
 * Demonstrates pattern for client-side pages with:
 * - Context usage
 * - API communication via backendAPI
 * - Loading state management
 * - Error handling
 * - Component composition
 */
import { useContext, useEffect, useState } from "react";

// components
import { PageContainer, Accordion } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

/**
 * Type definition for items displayed in the UI
 */
type ItemsType = {
  id: string;
  name: string;
  thumbnail: string;
};

export const Home = () => {
  // Access global state and dispatch
  const dispatch = useContext(GlobalDispatchContext);
  const { hasInteractiveParams } = useContext(GlobalStateContext);

  // Local component state
  const [items, setItems] = useState<ItemsType[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Effect to load initial data and send toast notification
   * Only runs when hasInteractiveParams changes
   */
  useEffect(() => {
    // Example of sending a toast notification via the API
    backendAPI
      .put("/world/fire-toast", { title: "Nice Work!", text: "You've successfully completed the task!" })
      .catch((error) => setErrorMessage(dispatch, error as ErrorType));

    // Only fetch data if we have valid interactive parameters
    if (hasInteractiveParams) {
      // Fetch game state data from the server
      backendAPI
        .get("/game-state")
        .then((response) => {
          // Update global state with the response data
          setGameState(dispatch, response.data);

          // Update local state with items from the response
          setItems(response.data.items || []);
        })
        .catch((error) => {
          // Handle and display errors using the global error handler
          setErrorMessage(dispatch, error as ErrorType);
        })
        .finally(() => {
          // Always set loading to false when the request completes
          setIsLoading(false);
        });
    }
  }, [hasInteractiveParams, dispatch]);

  /**
   * Handler for selecting an item
   * @param item - The item to select
   */
  const handleSelectItem = (item: ItemsType) => {
    setSelectedItem(item);
  };

  return (
    <PageContainer isLoading={isLoading} headerText="Page Header">
      <div className="grid gap-4 text-center">
        <p className="pt-4">Update the configuration.</p>

        {/* Accordion component for displaying settings */}
        <Accordion title="Settings">
          {/* Map through items and render them */}
          {items?.map((item) => (
            <div
              key={item.id}
              className={`mb-2 ${selectedItem?.id === item.id ? "selected" : ""}`}
              onClick={() => handleSelectItem(item)}
            >
              {/* Card component using Topia SDK styles */}
              <div className="card small">
                <div className="card-image" style={{ height: "auto" }}>
                  <img src={item.thumbnail} alt={item.name} />
                </div>
                <div className="card-details">
                  <h4 className="card-title h4">{item.name}</h4>
                </div>
              </div>
            </div>
          ))}

          {/* Show message when no items are available */}
          {items.length === 0 && <p className="text-center py-4">No items available</p>}
        </Accordion>
      </div>
    </PageContainer>
  );
};

export default Home;
