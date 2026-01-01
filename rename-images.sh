#!/bin/bash
# Скрипт для переименования файлов изображений
# Запустить: bash rename-images.sh

echo "Начинаем переименование файлов изображений..."

# Переименование файлов
if [ -f "file1.jpeg" ]; then mv "file1.jpeg" "fashion-women-clothing-ukraine-2025.jpg"; echo "file1.jpeg -> fashion-women-clothing-ukraine-2025.jpg"; fi
if [ -f "file2.jpeg" ]; then mv "file2.jpeg" "fashion-men-clothing-shoes-ukraine.jpg"; echo "file2.jpeg -> fashion-men-clothing-shoes-ukraine.jpg"; fi
if [ -f "file3.jpeg" ]; then mv "file3.jpeg" "fashion-kids-clothing-children-ukraine.jpg"; echo "file3.jpeg -> fashion-kids-clothing-children-ukraine.jpg"; fi
if [ -f "file4.jpeg" ]; then mv "file4.jpeg" "fashion-shoes-footwear-ukraine-2025.jpg"; echo "file4.jpeg -> fashion-shoes-footwear-ukraine-2025.jpg"; fi
if [ -f "file5.jpeg" ]; then mv "file5.jpeg" "fashion-accessories-bags-jewelry.jpg"; echo "file5.jpeg -> fashion-accessories-bags-jewelry.jpg"; fi
if [ -f "file6.jpeg" ]; then mv "file6.jpeg" "fashion-summer-dresses-women-2025.jpg"; echo "file6.jpeg -> fashion-summer-dresses-women-2025.jpg"; fi
if [ -f "file7.jpeg" ]; then mv "file7.jpeg" "fashion-winter-clothing-coats-jackets.jpg"; echo "file7.jpeg -> fashion-winter-clothing-coats-jackets.jpg"; fi
if [ -f "file8.jpeg" ]; then mv "file8.jpeg" "fashion-sportswear-sneakers-activewear.jpg"; echo "file8.jpeg -> fashion-sportswear-sneakers-activewear.jpg"; fi
if [ -f "file9.jpeg" ]; then mv "file9.jpeg" "fashion-evening-dresses-party-wear.jpg"; echo "file9.jpeg -> fashion-evening-dresses-party-wear.jpg"; fi
if [ -f "file10.jpeg" ]; then mv "file10.jpeg" "fashion-business-suits-office-wear.jpg"; echo "file10.jpeg -> fashion-business-suits-office-wear.jpg"; fi
if [ -f "file11.jpeg" ]; then mv "file11.jpeg" "fashion-jeans-denim-clothing-ukraine.jpg"; echo "file11.jpeg -> fashion-jeans-denim-clothing-ukraine.jpg"; fi
if [ -f "file12.jpeg" ]; then mv "file12.jpeg" "fashion-homewear-pajamas-loungewear.jpg"; echo "file12.jpeg -> fashion-homewear-pajamas-loungewear.jpg"; fi
if [ -f "file13.jpeg" ]; then mv "file13.jpeg" "fashion-swimwear-beachwear-ukraine.jpg"; echo "file13.jpeg -> fashion-swimwear-beachwear-ukraine.jpg"; fi
if [ -f "file14.jpeg" ]; then mv "file14.jpeg" "fashion-school-uniforms-kids-clothing.jpg"; echo "file14.jpeg -> fashion-school-uniforms-kids-clothing.jpg"; fi
if [ -f "file15.jpeg" ]; then mv "file15.jpeg" "fashion-wedding-dresses-bride-ukraine.jpg"; echo "file15.jpeg -> fashion-wedding-dresses-bride-ukraine.jpg"; fi
if [ -f "file16.jpeg" ]; then mv "file16.jpeg" "fashion-maternity-clothing-pregnant-women.jpg"; echo "file16.jpeg -> fashion-maternity-clothing-pregnant-women.jpg"; fi
if [ -f "file17.jpeg" ]; then mv "file17.jpeg" "fashion-jackets-coats-outerwear.jpg"; echo "file17.jpeg -> fashion-jackets-coats-outerwear.jpg"; fi
if [ -f "file18.jpeg" ]; then mv "file18.jpeg" "fashion-sweaters-knitwear-ukraine.jpg"; echo "file18.jpeg -> fashion-sweaters-knitwear-ukraine.jpg"; fi
if [ -f "file19.jpeg" ]; then mv "file19.jpeg" "fashion-t-shirts-tops-basics.jpg"; echo "file19.jpeg -> fashion-t-shirts-tops-basics.jpg"; fi
if [ -f "file20.jpeg" ]; then mv "file20.jpeg" "fashion-sunglasses-accessories-ukraine.jpg"; echo "file20.jpeg -> fashion-sunglasses-accessories-ukraine.jpg"; fi

echo "Переименование завершено!"
echo "Теперь обновите массив productShowcaseImages в index.html"