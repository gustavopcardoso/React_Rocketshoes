import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = await api.get<Product>(`/products/${productId}`);

      let currentCart = [...cart];

      let currentItem = currentCart.find((itemCart) => {
        return itemCart.id === productId;
      });

      const stockAmount = currentItem?.amount || 0;

      const productStock = await api.get(`/stock/${productId}`);

      if (productStock.data.amount <= stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (currentItem) {
        currentItem.amount += 1;
      }
      else {
        currentCart.push({
          ...product.data,
          amount: 1
        });
      }

      setCart(currentCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(currentCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const currentCart = [...cart];

      const indexProduct = currentCart.findIndex((product) => {
        return product.id === productId;
      })

      if (indexProduct < 0) {
        toast.error('Erro na remoção do produto');
        return false;
      }

      currentCart.splice(indexProduct, 1);

      setCart(currentCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(currentCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount === 0)
        return;

      const currentCart = [...cart];

      const existingProduct = currentCart.find((product) => {
        return product.id === productId;
      })

      if (!existingProduct) {
        toast.error('Erro na alteração de quantidade do produto');
        return false;
      }

      const productStock = await api.get(`/stock/${productId}`);

      if (productStock.data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return false;
      }

      existingProduct.amount = amount;
      setCart(currentCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(currentCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
