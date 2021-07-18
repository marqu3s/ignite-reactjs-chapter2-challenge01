import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

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
      const updatedCart = [...cart]; // creates a new reference.
      const productExists = updatedCart.find(p => p.id === productId);
      const stock = await api.get('/stock/' + productId).then(response => response.data);
      const stockQuantity = stock.amount;
      const newQuantity = productExists ? productExists.amount + 1 : 1;

      // Check stock quantity.
      if (stockQuantity < newQuantity) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      // Update existing product or add new product.
      if (productExists) {
        productExists.amount = newQuantity;
      } else {
        const product = await api.get('/products/' + productId)
          .then(result => {
            if (result.status === 404) {
              throw Error();
            }
            return result;
          })
          .then(result => result.data);
        product.amount = 1;
        updatedCart.push(product);
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      toast.success('Produto adicionado ao carrinho.');
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]; // creates a new reference.
      const index = updatedCart.findIndex(product => product.id === productId);
      if (index !== -1) {
        updatedCart.splice(index, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        toast.success('Produto removido do carrinho.');
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const updatedCart = [...cart];
      const productFound = updatedCart.find(product => product.id === productId);

      if (!productFound) {
        throw Error();
      }

      const stock = await api.get('/stock/' + productId).then(response => response.data);
      const stockQuantity = stock.amount;
      if (stockQuantity < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      productFound.amount = amount;
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      toast.success('Quantidade atualizada.');
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
