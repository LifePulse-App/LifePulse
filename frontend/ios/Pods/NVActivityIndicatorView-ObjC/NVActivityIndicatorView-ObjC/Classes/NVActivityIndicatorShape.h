#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, NVActivityIndicatorShape) {
    NVActivityIndicatorShapeCircle,
    NVActivityIndicatorShapeCircleSemi,
    NVActivityIndicatorShapeRing,
    NVActivityIndicatorShapeRingTwoHalfVertical,
    NVActivityIndicatorShapeRingTwoHalfHorizontal,
    NVActivityIndicatorShapeRingThirdFour,
    NVActivityIndicatorShapeRectangle,
    NVActivityIndicatorShapeTriangle,
    NVActivityIndicatorShapeLine,
    NVActivityIndicatorShapePacman,
    NVActivityIndicatorShapeStroke
};

@interface NVActivityIndicatorShapeHelper : NSObject
+ (CALayer *)layerWithShape:(NVActivityIndicatorShape)shape size:(CGSize)size color:(UIColor *)color;
@end

NS_ASSUME_NONNULL_END
